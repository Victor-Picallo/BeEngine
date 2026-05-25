const cal = JSON.parse((await (await fetch('https://www.fiaformula3.com/Calendar', { headers: { 'User-Agent': 'BeEngine/1.0' } })).text())
  .match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
console.log('F3 SeasonId', cal.props.pageProps.pageData.SeasonId, cal.props.pageProps.pageData.SeasonName);
