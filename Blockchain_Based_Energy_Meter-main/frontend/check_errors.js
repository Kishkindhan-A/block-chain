import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  // The user auth state is checked using localStorage.
  // We need to set it first so the page actually goes to /consumer
  await page.goto('http://localhost:5173');
  
  await page.evaluate(() => {
    localStorage.setItem('auth', JSON.stringify({ role: 'consumer', user: { meterId: 'MTR001', name: 'John Doe' } }));
  });

  console.log('Navigating to consumer page...');
  await page.goto('http://localhost:5173/consumer', { waitUntil: 'networkidle2' });
  
  await browser.close();
})();
