// Veto vote math. Absolute majority of eligible voters decides immediately.

/**
 * @param yes user ids who voted to veto
 * @param no user ids who voted to uphold
 * @param eligible user ids allowed to vote (challenged actor already excluded)
 * @returns {{result:'vetoed'|'upheld'|null, yes:number, no:number, eligible:number, allVoted:boolean}}
 * `result` is null while undecided. When everyone has voted without a majority
 * (a tie) the caller should apply the default, which is `vetoed`.
 */
function tally(yes, no, eligible) {
  const el = new Set(eligible);
  const yesSet = new Set(yes.filter((id) => el.has(id)));
  const noSet = new Set(no.filter((id) => el.has(id) && !yesSet.has(id)));
  const majority = Math.floor(el.size / 2) + 1;
  let result = null;
  if (el.size > 0) {
    if (yesSet.size >= majority) result = 'vetoed';
    else if (noSet.size >= majority) result = 'upheld';
  }
  return {
    result,
    yes: yesSet.size,
    no: noSet.size,
    eligible: el.size,
    allVoted: el.size > 0 && yesSet.size + noSet.size >= el.size,
  };
}

/** Outcome once the vote can no longer change: the majority result, else the default (annulled). */
function finalResult(t) {
  return t.result || 'vetoed';
}

module.exports = { tally, finalResult };
