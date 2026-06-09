async function main() {
  const url = 'https://crm-backend-l7jq.onrender.com/api/v1/attendances/by-date?group_id=1&date=2026-06-04';
  console.log(`Requesting URL: ${url}`);
  try {
    const res = await fetch(url);
    console.log('Response Status:', res.status);
    const data = await res.json();
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('API request failed:', err.message);
  }
}

main();
