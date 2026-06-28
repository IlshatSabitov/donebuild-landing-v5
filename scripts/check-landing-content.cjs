const fs = require('fs');

const signupUrl = 'https://app.donebuild.com/auth/sign-up?redirect_url=/onboarding';
const loginUrl = 'https://app.donebuild.com/auth/sign-in?redirect_url=/dashboard';
const files = ['body.html', 'index.html'];
const requiredMain = [
  'What remodelers are saying',
  'Rutherford Construction',
  'Revamp Home Services',
  'Moda Kitchen',
  'Axiom Tile LLC',
  'Solo and small kitchen and bath remodelers are already running faster with DoneBuild.',
  '5.0 from founding users',
  'video-testimonial-grid',
  'firuz-donebuild-testimonial.mp4',
  'chris-donebuild-testimonial.mp4',
  'caleb-donebuild-testimonial.mp4',
  'preload="none"',
  'exclusivePlaybackBound',
  'Firuz - Moda Kitchen',
  'Chris - Strantzform Construction',
  'Caleb - Axiom Tile',
  'Faster estimate turnaround',
  'More professional workflow',
  'Simple enough for small crews',
  'Easiest PM tool for remodelers running 1-5 jobs/month.',
  'Save up to 40 hrs/month on admin work.',
  'Get signed up and send your 1st professional estimate in less than 5 mins. Try for yourself. No CC required.',
  '5 free estimate sends · no card required',
  'First 5 estimate sends free · no credit card required',
  'And the guy swinging the hammer.',
  'sawdust on your hands',
  'Need crew GPS',
  loginUrl,
  signupUrl,
  'How a job moves through DoneBuild',
  'Walk-through Tuesday',
  'Deposit Wednesday',
  'Estimate sent by magic link',
  'The client opens it on phone or laptop and signs without an app.',
  "Okay, no problem. I'll take care of it.",
  'co-r7-typing-bubble',
  'You eat &lt;b&gt;$1,800&lt;/b&gt;. Silently. Because you can\'t afford to lose this customer.',
  'Watching the contractor cave',
  'Get started free - no card required',
  '$54,701',
  'In jobs won · by morning',
  'Roughly three unsigned change orders a year',
  'No onboarding call required, unless you want to talk shop with Tommy',
  'Built for every trade, every crew size, and every workflow',
  'Built around one workflow: kitchen and bath estimates, approvals, change orders, invoices, and payments',
  'Terms of Service',
  'Privacy',
];
const forbiddenMain = [
  'Created with Perplexity Computer',
  '$200 to $300 a month',
  'for $79.',
  'Built for "all contractors" so it fits no one well',
  '$79 flat. Unlimited everything. Locked for life.',
  '$99 to $399 a month',
  'style="margin-top:8px"',
  'Is this just ChatGPT in a wrapper?',
  '<em>Founding user</em>',
  "You're juggling 3 jobs, 5 apps, and a stack of unpaid invoices.",
  'DoneBuild is the one tool that handles estimates, signed change orders, and payments. Built for solo kitchen and bath remodelers.',
  "You're describing the job at the table",
  'This is for you if',
  'Client signs on phone',
  'One tap. No app, no DocuSign, no password.',
  'Okay, sure. No problem.',
  'The client is right. The contractor has nothing in writing. You eat <b>$1,800</b>.',
  'Contractor eats <b>$1,800</b>',
  'https://app.donebuild.com/subscribe?plan=pilot&channel=landing_v4',
  '14-day free trial',
  '14-day trial',
  '42 of 100',
  'Slots filled',
  'Solo K&amp;B remodelers: stop running your business at 11pm.',
  'This is what 22 seconds with DoneBuild looks like.',
  '$79/mo · Unlimited · Cancel anytime',
  'Create and send kitchen &amp; bath estimates in under 5 minutes.',
  'Built for solo remodelers who need estimates, e-signatures, change orders, and payments in one simple workflow.',
  'Get started free · 5 estimate sends included',
  'Look like an established remodeler clients trust enough to hire.',
  "Create polished estimates in minutes, even if you're still running the business yourself.",
  'Speak the job once. DoneBuild turns it into a polished estimate.',
  'Send estimates that make you look professional.',
  'First estimate in under 5 minutes · 5 free sends · no card',
  'Look professional before the job starts.',
  'The easiest way for remodelers running 1-5 jobs a month to create estimates, get approvals, and keep change orders and payments organized.',
  'Create professional estimates in minutes, let clients approve and sign from their phone, and keep scope changes from turning into lost money.',
];
const requiredPages = [
  'founders-note/index.html',
  'founders-note/body.html',
  'contact/index.html',
  'contact/body.html',
  'terms-service/index.html',
  'terms-service/body.html',
  'terms/index.html',
  'terms/body.html',
];
const order = [
  'id="qualifier"',
  'id="change-orders"',
  'From "the check is in the mail"',
  'Built on your numbers',
  'id="reviews"',
  'video-testimonial-grid',
  'id="how"',
  'id="savings"',
  'id="whats-different"',
  'id="pricing"',
  'Honest comparison',
  'DoneBuild ships every week',
  'id="faq"',
  'id="trial"',
];

const failures = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');

  for (const needle of requiredMain) {
    if (!text.includes(needle)) failures.push(`${file}: missing ${needle}`);
  }

  for (const needle of forbiddenMain) {
    if (text.includes(needle)) failures.push(`${file}: still contains ${needle}`);
  }

  let last = -1;
  for (const needle of order) {
    const index = text.indexOf(needle);
    if (index === -1) failures.push(`${file}: missing order marker ${needle}`);
    if (index !== -1 && index < last) failures.push(`${file}: out of order ${needle}`);
    last = index;
  }

  const savings = text.indexOf('class="savings-grid"');
  const source = text.indexOf('Sources:', savings);
  const payback = text.indexOf('class="payback"', savings);
  if (savings === -1 || source === -1 || payback === -1 || !(savings < source && source < payback)) {
    failures.push(`${file}: savings sources are not directly after savings cards and before payback`);
  }
}

for (const page of requiredPages) {
  if (!fs.existsSync(page)) failures.push(`missing page ${page}`);
}

for (const file of requiredPages) {
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of [signupUrl, loginUrl, '© 2026 DoneBuild']) {
    if (!text.includes(needle)) failures.push(`${file}: missing ${needle}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('landing content checks passed');
