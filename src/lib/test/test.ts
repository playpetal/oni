export async function test(
  func: (...any: any) => any,
  args: any[],
  rounds: number = 100,
  name: string
) {
  const trueStart = process.hrtime.bigint();

  if (isNaN(rounds)) rounds = 100;

  let completed: { success: boolean; ms: number }[] = [];

  while (completed.length < rounds) {
    const start = process.hrtime.bigint();
    let success = false;

    try {
      await func(...args);
      success = true;
    } catch (e) {
      console.log(e);
    }

    const end = process.hrtime.bigint();
    completed.push({
      success,
      ms: Number(end - start) / 1000000,
    });
  }

  const trueEnd = process.hrtime.bigint();
  const time = Number(trueEnd - trueStart) / 1000000;

  const successes = completed.filter((c) => c.success);
  const failures = completed.filter((c) => !c.success);

  const successCount = successes.length;
  const failureCount = failures.length;

  const percentFailure = (failureCount / rounds) * 100;
  const percentSuccess = (100 - percentFailure).toFixed(2);

  const timings = successes.map((c) => c.ms);

  const shortestAttempt = [...timings].sort()[0] || 0;
  const longestAttempt = [...timings].sort().reverse()[0] || 0;

  const average =
    (timings.length > 1
      ? timings.reduce((a, b) => a + b) / timings.length
      : timings[0]) || 0;

  console.log(
    `\n======================== Test: ${name} ========================` +
      `\n${successCount.toLocaleString()} succeeded, ${failureCount.toLocaleString()} failed (${percentSuccess}% passing)` +
      `\n${shortestAttempt.toFixed(3)}ms MIN, ${longestAttempt.toFixed(
        2
      )}ms MAX (${average.toFixed(3)}ms AVG)` +
      `\n-- Completed ${
        completed.length
      } rounds (max ${rounds}) in ${time.toFixed(3)}ms --\n`
  );
}
