# Backup and restore runbook

What to do if data in one of the DynamoDB tables gets deleted or
corrupted. Written so that someone who isn't me can follow it, step by
step. The drill at the bottom is a real one I ran to prove it works.

## What's protected, and what isn't

| Thing | Protected by | How to get it back |
|---|---|---|
| `Players`, `Team`, `Match`, `ScoreEvent` tables | **Point-in-time recovery (PITR)**, on for all four. Roll back to any second in the last 35 days. | This runbook |
| The same four tables, against being deleted | **Deletion protection**, on for all four | Switch it off first if you really mean to delete one |
| The website files | They're built from git by the pipeline | Re-run the Deploy workflow |
| The infrastructure | It's all in `cloudformation/template.yaml` | Re-run the Deploy workflow |
| Captain logins (Cognito) | **Nothing.** Cognito users aren't backed up. | Recreate each one, see `cloudformation/README.md` ("To add a captain") |

A restore **never overwrites the live table**. It always builds a brand
new table from the chosen moment in time. That's what makes it safe to try.

## What you need

- AWS CLI access to the account. Use the `sports-day` profile (or an admin
  SSO login). Every command below assumes `--region eu-west-2`.
- `jq` for the bulk copy (it's pre-installed on a Mac).
- The name of the table that's wrong, and your best guess of **when it was
  last good**, in UTC.

Set these once so you can copy and paste:

```bash
export AWS_REGION=eu-west-2
export AWS_PROFILE=sports-day
TABLE=Players                      # the table that's wrong
GOOD_TIME=2026-10-31T13:29:31Z     # last moment it was correct, UTC
```

## Step 1: stop the damage

Before restoring anything, make sure it isn't still happening. If a captain
keeps adding bad data, ask them to stop. If you think it's a bug, don't
fix it yet, restore first and fix after, so you've got a clean copy.

**Don't delete the damaged live table.** You don't need to, and you'll want
it to compare against.

## Step 2: check the moment you want is restorable

```bash
aws dynamodb describe-continuous-backups --table-name $TABLE \
  --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription'
```

You need `GOOD_TIME` to be **after** `EarliestRestorableDateTime` and
**before** `LatestRestorableDateTime`. Heads up: `LatestRestorableDateTime`
runs about **5 minutes behind real time**. So if the damage happened under 5
minutes ago and you want the moment just before it, you have to wait for
it to catch up. The drill below hit exactly this.

## Step 3: restore into a new table

```bash
aws dynamodb restore-table-to-point-in-time \
  --source-table-name $TABLE \
  --target-table-name ${TABLE}-restored \
  --restore-date-time $GOOD_TIME
```

Then wait for it. This took **about 3 minutes 40 seconds** for a tiny table
in the drill:

```bash
aws dynamodb wait table-exists --table-name ${TABLE}-restored
aws dynamodb describe-table --table-name ${TABLE}-restored --query 'Table.TableStatus'
```

It should say `ACTIVE` before you carry on.

## Step 4: see what's different

```bash
aws dynamodb scan --table-name $TABLE --output json | jq -c '.Items[]' | sort > live.txt
aws dynamodb scan --table-name ${TABLE}-restored --output json | jq -c '.Items[]' | sort > restored.txt
diff live.txt restored.txt
```

Lines starting `<` are in the live table only, `>` are in the restored one
only. Items that were deleted show up as `>`, and corrupted items show up
as a pair.

## Step 5: put the good data back

**A few items** (this is what the drill tested). Use each item's key.
`Players` is keyed on `playerId`, `Team` on `teamId`, `Match` on `matchId`,
`ScoreEvent` on `eventId`:

```bash
item=$(aws dynamodb get-item --table-name ${TABLE}-restored \
  --key '{"playerId":{"S":"<the id>"}}' --query Item --output json)
aws dynamodb put-item --table-name $TABLE --item "$item"
```

**The whole table** (also tested, on a throwaway pair of tables). This
copies every item from the restored table into the live one, overwriting
any with the same key:

```bash
aws dynamodb scan --table-name ${TABLE}-restored --output json \
  | jq -c '.Items[]' \
  | while read -r item; do
      aws dynamodb put-item --table-name $TABLE --item "$item"
    done
```

Be aware that this **does not delete** items that exist in the live table
but not the restored one. If something bad was *added* after `GOOD_TIME`,
remove it by hand with `delete-item`.

## Step 6: check it worked

Open the site and look at the standings, the match history and the team
rosters (tap a team to see its players). Then run the `diff` from step 4
again. It should be empty, apart from anything legitimately added since.

## Step 7: clean up

The restored table is a plain copy. It doesn't get PITR, tags or alarms
from the original, and it costs money while it exists, so delete it. If
deletion protection turns out to be on for it, switch that off first
(command in the next section):

```bash
aws dynamodb delete-table --table-name ${TABLE}-restored
```

## If a whole table was deleted

Deletion protection is on to stop this, so you'd have had to switch it off
first. If it happened anyway: **I have not tested this path.** My
understanding is that you can restore a deleted table from PITR into a new
table the same way as above, but I haven't proven it, and I don't know
whether the PITR history survives the delete. Don't assume it does. If it
comes to it, try step 3 against the deleted table's name straight away, and
check the "Backups" page in the DynamoDB console in case a backup was kept.
The CloudFormation stack would also need to be brought back in line
afterwards.

Because the tables are protected, tearing down the whole stack will fail
on them. To remove the stack on purpose, switch deletion protection off on
each table first:

```bash
aws dynamodb update-table --table-name $TABLE --no-deletion-protection-enabled
```

---

# The drill: I broke something and fixed it

I tested this for real on **31 October 2026**, using a throwaway table
(`sports-day-dr-test`) so the real data was never involved. It was created
with the CLI, got PITR switched on, and was deleted at the end.

## What I did

1. Created the table and switched PITR on (took 22 seconds in total).
2. Wrote 5 good items (`player-1` to `player-5`) and noted the time.
3. **Broke it:** deleted item 3, and overwrote item 4 with garbage
   (`CORRUPTED`). The table now held 1, 2, 5 and a bad 4.
4. Started the clock, then followed this runbook: restored the table to
   the moment before the damage, copied items 3 and 4 back, checked.
5. Deleted both scratch tables.

## Timeline (all times UTC)

| Time | What happened |
|---|---|
| 13:28:08 | Created the table |
| 13:28:30 | PITR on |
| 13:29:31 | Good state recorded, 5 items |
| 13:30:01 | Deleted item 3, corrupted item 4 |
| 13:30:02 | **Problem noticed, clock starts** |
| 13:34:48 | PITR had caught up to the moment I wanted, restore started |
| 13:38:30 | Restored table `ACTIVE` |
| 13:38:32 | Items 3 and 4 copied back, all 5 correct. **Done** |

## How long recovery took

**509 seconds, about 8 and a half minutes**, from noticing the problem to
having every item back and correct.

- About **4 minutes 46 seconds** of that was just waiting for PITR to
  catch up. The restore point was only about 30 seconds before the damage,
  and PITR runs roughly 5 minutes behind. That wait only happens when you
  catch a problem quickly. If the damage is more than 5 minutes old you
  won't wait at all.
- About **3 minutes 40 seconds** was the restore itself.
- About **2 seconds** was copying the two items back.

So for a real incident noticed later than 5 minutes after it happened,
expect roughly 4 minutes of restore plus however long the copy-back takes.

## What went wrong, and what I'd improve

Nothing went wrong in the drill, but it showed me the gaps:

- **The restore is fiddly to do under stress.** I'd turn steps 2 to 5 into
  a single script that takes a table name and a time, instead of copying
  commands from a doc.
- **The restore needs a guess at "when was it last good".** There's
  nothing that tells me. Alarms on item counts, or logging every write,
  would help.
- **Cognito users aren't covered at all.** If the user pool was lost, I'd
  recreate the captains by hand. For four people that's fine. For more,
  I'd export them.
- **I tested single tables with 5 items.** Restore time scales with table
  size, but these tables will never get big. I haven't tested anything
  larger.
- **Full table deletion is untested** (see above). The honest fix is
  prevention, which is why deletion protection is on.
- **I should repeat the drill on the real tables sometimes**, restoring to
  a side table and diffing, to prove PITR is still working. A restore
  nobody's tried in six months is a restore nobody can trust.
