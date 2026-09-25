const js = (await Bun.file('./bundle.js').text()).replaceAll('</script', '<\\/script');
const css = await Bun.file('./output.css').text();

console.log(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>InfoSec queue performance</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script>window.__ROUTE_PATH__=${JSON.stringify(process.env.ROUTE_PATH ?? '').replaceAll('</script', '<\\/script')};</script>
  <script type="module">${js}</script>
</body>
</html>`);
