const js = (await Bun.file('./bundle.js').text()).replaceAll('</script', '<\\/script');
const css = await Bun.file('./output.css').text();

console.log(`<!DOCTYPE html>
<html data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Case reporting — Tines</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.ico?t=Cases">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script>window.__ROUTE_PATH__=${JSON.stringify(process.env.ROUTE_PATH ?? '').replaceAll('</script', '<\\/script')};window.__BRANCH_ID__=${JSON.stringify(process.env._3B_BRANCH_ID ?? '')};</script>
  <script type="module">${js}</script>
</body>
</html>`);
