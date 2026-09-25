const js = (await Bun.file('./bundle.js').text()).replaceAll('</script', '<\\/script');
const css = await Bun.file('./output.css').text();

console.log(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Log Search</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.__ROUTE_PATH__=${JSON.stringify(process.env.ROUTE_PATH ?? '').replaceAll('</script', '<\\/script')};
    window.__BRANCH_ID__=${JSON.stringify(process.env._3B_BRANCH_ID ?? '').replaceAll('</script', '<\\/script')};
  </script>
  <script type="module">${js}</script>
</body>
</html>`);
