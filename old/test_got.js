async function test() {
  const { gotScraping } = await import('got-scraping');
  try {
    const response = await gotScraping({
      url: 'https://chatgpt.com/backend-api/share/6ab237c6-ec08-83e8-9d61-2f5bb9b128be',
      headerGeneratorOptions: {
        browsers: [{name: 'chrome', minVersion: 120, maxVersion: 121}],
        devices: ['desktop'],
        operatingSystems: ['windows']
      }
    });
    console.log('Status:', response.statusCode);
    console.log('Length:', response.body.length);
    console.log(response.body.substring(0, 300));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.statusCode);
      console.error(error.response.body.substring(0, 300));
    }
  }
}

test();
