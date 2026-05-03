const fs = require('fs');

const signupUrl = 'https://app.donebuild.com/subscribe?plan=pilot&channel=landing_v4';
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
  loginUrl,
  signupUrl,
  'How a job moves through DoneBuild',
  'Walk-through Tuesday',
  'Deposit Wednesday',
  'Contractor eats <b>$1,800</b>',
  'Claim founding spot',
  '42 of 100',
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
