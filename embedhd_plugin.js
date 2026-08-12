// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
  return JSON.stringify({
    id: "embedhd",
    name: "EmbedHD",
    version: "1.0.8",
    baseUrl: BASE_DOMAIN,
    iconUrl: "https://i.ibb.co/wrrMVcwk/embedhd-logo.jpg",
    isEnabled: true,
    isAdult: false,
    type: "MOVIE",
    layoutType: "HORIZONTAL",
    playerType: "embed",
    debug: true
  });
}

function getHomeSections() {
  return JSON.stringify([
    { slug: "live", title: "🔴 LIVE", type: "Horizontal", path: "" },
    { slug: "soccer", title: "Soccer ⚽", type: "Horizontal", path: "" },
    { slug: "fight", title: "Fight 🥊", type: "Horizontal", path: "" },
    { slug: "baseball", title: "Baseball ⚾", type: "Horizontal", path: "" },
    {
      slug: "basketball",
      title: "Basketball 🏀",
      type: "Horizontal",
      path: ""
    },
    { slug: "motor", title: "Motor 🏎️", type: "Horizontal", path: "" },
    { slug: "tennis", title: "Tennis 🎾", type: "Horizontal", path: "" },
    { slug: "football", title: "Football ⚽", type: "Horizontal", path: "" },
    { slug: "hockey", title: "Hockey 🏒", type: "Horizontal", path: "" },
    { slug: "other", title: "Other 🎯", type: "Grid", path: "" }
  ]);
}

function getPrimaryCategories() {
  return JSON.stringify([
    { name: "Soccer", slug: "soccer" },
    { name: "Fight", slug: "fight" },
    { name: "Baseball", slug: "baseball" },
    { name: "Basketball", slug: "basketball" },
    { name: "Motor", slug: "motor" },
    { name: "Tennis", slug: "tennis" },
    { name: "Football", slug: "football" },
    { name: "Hockey", slug: "hockey" },
    { name: "Other", slug: "other" }
  ]);
}

function getFilterConfig() {
  return JSON.stringify({ sort: [], category: [] });
}

// =============================================================================
// NHÓM 2: SINH URL (App gọi hàm → nhận URL → tự fetch HTTP)
// =============================================================================
function getUrlList(slug, filtersJson) {
  return `${BASE_DOMAIN}?category=${slug}`;
}

function getUrlSearch(keyword = "", filtersJson) {
  return `${BASE_DOMAIN}?search=${encodeURIComponent(keyword?.trim())}`;
}

function getUrlDetail(path) {
  if (!path) return "";
  if (path.indexOf("http") === 0) return path;
  return `${BASE_DOMAIN}${path}`;
}

function getUrlCategories() {
  return "";
}
function getUrlCountries() {
  return "";
}
function getUrlYears() {
  return "";
}

// =============================================================================
// NHÓM 3: PARSER (App fetch URL xong → ném HTML/JSON thô vào đây → bạn parse)
// =============================================================================

function parseListResponse(html, apiUrl) {
  try {
    if (Object.keys(streamList).length === 0) {
      // get card html class event-row
      pattern =
        /<article\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bevent-card\b[^"']*["'])[^>]*>/gi;
      const cardsHtml = extractCardsHtml(html, pattern, "article");
      // console.log(cardsHtml[0]);
      // extract item
      cardsHtml.forEach((cardHtml) => {
        extractItem(cardHtml);
      });
    }
    let streams = null;
    const items = [];
    const category = extractParamFromUrl(apiUrl, "category");
    const keyword = extractParamFromUrl(apiUrl, "search");
    if (category && category === "live")
      streams = filterStreams(streamList, ["category", "live"]);
    else if (category) streams = streamList[category] || [];
    else if (keyword) streams = filterStreams(streamList, ["search", keyword]);

    streams.forEach((stream, index) => {
      const dateTime = formatDateTime(stream.dataStart);
      const tLInfo = isLive(dateTime) ? "LIVE" : dateTime;
      const encodedData = encodeURIComponent(
        JSON.stringify({
          title: stream.dataTitle,
          posterUrl: stream.leagueLogo || FALLBACK_POSTER_URL,
          backdropUrl: stream.leagueLogo || FALLBACK_POSTER_URL,
          description: `Event "${stream.dataTitle}" is hosted on server EmbedHD`,
          quality: tLInfo,
          episode_current: "HD",
          lang: `${stream.dataCat} - ${stream.leagueName}`.toUpperCase()
        })
      );

      items.push({
        id: `${BASE_DOMAIN}?category=${stream.dataCat}&id=${streamList[stream.dataCat].findIndex((item) => item.dataTitle === stream.dataTitle)}|data:${encodedData}`,
        title: stream.dataTitle,
        posterUrl: stream.leagueLogo || FALLBACK_POSTER_URL,
        backdropUrl: stream.leagueLogo || FALLBACK_POSTER_URL,
        quality: tLInfo,
        episode_current: "HD",
        lang: `${stream.dataCat} - ${stream.leagueName}`.toUpperCase()
      });
    });

    return JSON.stringify({
      items: items,
      pagination: { currentPage: 1, totalPages: 1 }
    });
  } catch (error) {
    console.error(
      "⛔ [parseListResponse in embedhd_plugin.js] ERROR MESSAGE: ",
      error
    );
    return EMPTY_LIST_RESPONSE;
  }
}

function parseSearchResponse(html, apiUrl) {
  return parseListResponse(html, apiUrl);
}

function parseMovieDetail(html, apiUrl) {
  try {
    const data = JSON.parse(decodeURIComponent(getPipeData(apiUrl)));
    const episodes = [];
    const category = extractParamFromUrl(apiUrl.split("|")[0], "category");
    const id = extractParamFromUrl(apiUrl.split("|")[0], "id");
    const channels = streamList[category][id].channels || [];

    channels.forEach((channel, index) => {
      episodes.push({
        id: `${BASE_DOMAIN}/source/fetch.php?hd=${channel}`,
        name: `Channel ${index + 1} - HD ${channel}`,
        slug: `/source/fetch.php?hd=${channel}`
      });
    });

    return JSON.stringify({
      id: apiUrl,
      title: data.title,
      posterUrl: data.posterUrl || FALLBACK_POSTER_URL,
      backdropUrl: data.posterUrl || FALLBACK_POSTER_URL,
      quality: data.quality,
      episode_current: data.episode_current,
      description: data.description,
      servers: [{ name: "ADMIN", episodes: episodes }],
      lang: data.lang
    });
  } catch (error) {
    console.error(
      "⛔ [parseMovieDetail in embedhd_plugin.js] ERROR MESSAGE: ",
      error
    );
    return EMPTY_ITEM_DETAIL;
  }
}

function parseDetailResponse(html, embedUrl) {
  console.log(
    "✅ [parseDetailResponse in embedhd_plugin.js] embed url: ",
    embedUrl
  );
  try {
    return JSON.stringify({
      isEmbed: false,
      url: embedUrl,
      headers: {
        Referer: embedUrl,
        Origin: embedUrl,
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Sec-Ch-Ua":
          '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        Accept: "*/*",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "X-Requested-With": "com.android.chrome"
      }
    });
  } catch (error) {
    console.error(
      "⛔ [parseDetailResponse in embedhd_plugin.js] ERROR MESSAGE: ",
      error
    );
    return "{}";
  }
}

function parseCategoriesResponse(html) {
  return "[]";
}
function parseCountriesResponse(html) {
  return "[]";
}
function parseYearsResponse(html) {
  return "[]";
}

// =============================================================================
// NHÓM 4: HELPERS
// =============================================================================

// ======================================
// VARIABLES
// ======================================

const BASE_DOMAIN = "https://embedhd.st";
const API_URL = "https://embedhd.st/api-event.php";
const FALLBACK_POSTER_URL = "https://i.ibb.co/rKHf363x/fallback-thumbnail.webp";
const EMPTY_ITEM_DETAIL = JSON.stringify({
  id: "",
  title: "⚠️ Stream Link Not Found!",
  posterUrl: FALLBACK_POSTER_URL,
  backdropUrl: FALLBACK_POSTER_URL,
  servers: []
});
const EMPTY_LIST_RESPONSE = JSON.stringify({
  items: [],
  pagination: { currentPage: 1, totalPages: 1 }
});

const streamList = {};

// ======================================
// FUNCTIONS
// ======================================

function extractParamFromUrl(url, param) {
  if (!url) return "";
  var match = url.match(new RegExp("[?&]" + param + "=([^&]+)"));
  return match ? decodeURIComponent(match[1]) : "";
}

// Extract HTML cards blocks by pattern and handle nested tags correctly
function extractCardsHtml(htmlContent, cardPattern, htmlTagName) {
  var result = [];
  var match;
  // Standardize tag names: <DIV>, <Div>, </DIV>... → div
  var tag = String(htmlTagName)
    .replace(/[<>\/\s]/g, "")
    .toLowerCase();
  // Regex for opening and closing tags, case-insensitive.
  var openTagRegex = new RegExp("<" + tag + "\\b[^>]*>", "gi");
  var closeTagRegex = new RegExp("<\\/" + tag + "\\s*>", "gi");

  while ((match = cardPattern.exec(htmlContent)) !== null) {
    var start = match.index;
    var pos = start + match[0].length;
    var count = 1;

    while (count > 0) {
      // Find the next opening tag
      openTagRegex.lastIndex = pos;
      // Find the next closing tag
      closeTagRegex.lastIndex = pos;
      var openMatch = openTagRegex.exec(htmlContent);
      var closeMatch = closeTagRegex.exec(htmlContent);
      var open = openMatch ? openMatch.index : -1;
      var close = closeMatch ? closeMatch.index : -1;

      // No more closing tags
      if (close === -1) {
        break;
      }
      // Opening tag appears before closing tag → nested
      if (open !== -1 && open < close) {
        count++;
        pos = open + openMatch[0].length;
      } else {
        count--;
        pos = close + closeMatch[0].length;
      }
    }

    result.push(htmlContent.substring(start, pos));
  }

  return result;
}

const normalizeText = (text) =>
  text
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function extractItem(cardHtml) {
  // data-cat
  const dataCat =
    cardHtml.match(/<article\b[^>]*\bdata-cat\s*=\s*["']([^"']*)["']/i)?.[1] ??
    "";
  // data-title
  const dataTitle =
    cardHtml.match(
      /<article\b[^>]*\bdata-title\s*=\s*["']([^"']*)["']/i
    )?.[1] ?? "";
  // data-home-logo
  const dataHomeLogo =
    cardHtml.match(
      /<article\b[^>]*\bdata-home-logo\s*=\s*["']([^"']*)["']/i
    )?.[1] ?? "";
  // data-away-logo
  const dataAwayLogo =
    cardHtml.match(
      /<article\b[^>]*\bdata-away-logo\s*=\s*["']([^"']*)["']/i
    )?.[1] ?? "";
  // data-start
  const dataStart =
    cardHtml.match(
      /<article\b[^>]*\bdata-start\s*=\s*["']([^"']*)["']/i
    )?.[1] ?? "";
  // data-hds
  const dataHds =
    cardHtml.match(/<article\b[^>]*\bdata-hds\s*=\s*["']([^"']*)["']/i)?.[1] ??
    "";
  // img.thumb-league-logo -> src
  const leagueLogo =
    cardHtml.match(
      /<img\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bthumb-league-logo\b[^"']*["'])[^>]*\bsrc\s*=\s*["']([^"']*)["']/i
    )?.[1] ?? "";
  // img.thumb-league-logo -> alt
  const leagueName = normalizeText(
    cardHtml.match(
      /<img\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bthumb-league-logo\b[^"']*["'])[^>]*\balt\s*=\s*["']([^"']*)["']/i
    )?.[1] ?? ""
  );

  if (!streamList[dataCat]) streamList[dataCat] = [];

  streamList[dataCat].push({
    dataCat,
    dataTitle: dataTitle.replace("-", "vs"),
    dataHomeLogo: dataHomeLogo
      ? BASE_DOMAIN + dataHomeLogo.replaceAll("&amp;", "&")
      : "",
    dataAwayLogo: dataAwayLogo
      ? BASE_DOMAIN + dataAwayLogo.replaceAll("&amp;", "&")
      : "",
    dataStart,
    leagueLogo: leagueLogo
      ? BASE_DOMAIN + leagueLogo.replaceAll("&amp;", "&")
      : "",
    leagueName,
    channels: dataHds ? JSON.parse(dataHds) : []
  });
}

// data-countdown="1786888800"
function formatDateTime(dataStart) {
  var date = new Date(Number(dataStart) * 1000);
  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }
  return (
    pad2(date.getHours()) +
    ":" +
    pad2(date.getMinutes()) +
    "-" +
    pad2(date.getDate()) +
    "/" +
    pad2(date.getMonth() + 1)
  );
}

function isLive(dateTime) {
  // dateTime format: "22:30-05/08" hoặc "3:30-05/08"
  // Mặc định GMT+7
  var match = /^(\d{1,2}):(\d{2})-(\d{2})\/(\d{2})$/.exec(dateTime);

  if (!match) {
    return false;
  }
  var hour = Number(match[1]);
  var minute = Number(match[2]);
  var day = Number(match[3]);
  var month = Number(match[4]);

  // Validate
  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }
  // Lấy năm hiện tại theo UTC
  var now = new Date();
  var year = now.getUTCFullYear();
  // GMT+7 -> UTC
  var eventTimestamp = Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0);

  // So sánh timestamp hiện tại (UTC)
  return eventTimestamp <= Date.now();
}

function getPipeData(apiUrl) {
  if (!apiUrl) return "";
  const index = apiUrl.indexOf("|");

  if (index < 0) return "";
  var res = apiUrl.substring(index + 1).replace(/^\s+/, "");
  // Remove the prefix "data:" if present (case-insensitive)
  if (res.toLowerCase().indexOf("data:") === 0) return res.substring(5);

  return res;
}

function filterStreams(streamList, [filterKey, filterValue]) {
  const result = [];
  // filter streams by live
  if (filterValue && filterKey === "category") {
    // live
    if (filterValue === "live") {
      Object.keys(streamList).forEach((category) => {
        const streams = streamList[category];
        streams.forEach((stream) => {
          const dateTime = formatDateTime(stream.dataStart);
          if (isLive(dateTime)) result.push(stream);
        });
      });
    }
  }
  // filter streams by search
  else if (filterValue && filterKey === "search") {
    Object.keys(streamList).forEach((category) => {
      const streams = streamList[category];
      streams.forEach((stream) => {
        filterValue = filterValue.toLowerCase();
        const streamName = stream.dataTitle.toLowerCase();
        const isTrue = streamName.indexOf(filterValue) >= 0;
        if (isTrue) result.push(stream);
      });
    });
  }
  return result;
}
