// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
  return JSON.stringify({
    id: "embedhd",
    name: "EmbedHD",
    version: "1.0.4",
    baseUrl: "https://embedhd.st",
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
    { slug: "basketball", title: "Basketball 🏀", type: "Horizontal", path: "" },
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
      pattern = /<div\b(?=[^>]*\bclass="[^"]*\bevent-row\b[^"]*")[^>]*>/gi;
      const cardsHtml = extractCardsHtml(html, pattern, "div");
      // console.log(cardsHtml)
      // extract item
      cardsHtml.forEach((cardHtml) => {
        const event = extractItem(cardHtml);
        if (event) items.push(event);
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
      const dateTime = formatGameDate(stream.gameTime, stream.gameDate);
      const tLInfo = isLive(dateTime) ? "LIVE" : dateTime;
      const encodedData = encodeURIComponent(
        JSON.stringify({
          title: stream.dataTitle,
          posterUrl: stream.leagueLogo,
          backdropUrl: stream.leagueLogo,
          description: `Event "${stream.title}" is hosted on server EmbedHD`,
          quality: tLInfo,
          episode_current: "HD",
          lang: `${stream.dataCat} - ${stream.leagueTitle}`.toUpperCase()
        })
      );

      items.push({
        id: `${BASE_DOMAIN}?category=${stream.dataCat}&id=${index}|data:${encodedData}`,
        title: stream.dataTitle,
        posterUrl: stream.leagueLogo,
        backdropUrl: stream.leagueLogo,
        quality: tLInfo,
        episode_current: "HD",
        lang: `${stream.dataCat} - ${stream.leagueTitle}`.toUpperCase()
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
    return EMPTY_ITEM_DETAIL;
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
  let results = [];
  let match;

  while ((match = cardPattern.exec(htmlContent)) !== null) {
    let start = match.index;
    let pos = start + match[0].length;
    let count = 1;

    while (count > 0) {
      let open = htmlContent.indexOf(`<${htmlTagName}`, pos);
      let close = htmlContent.indexOf(`</${htmlTagName}>`, pos);

      if (close === -1) break;
      if (open !== -1 && open < close) {
        count++;
        pos = open + 4;
      } else {
        count--;
        pos = close + 6;
      }
    }

    results.push(htmlContent.substring(start, pos));
  }

  return results;
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
    cardHtml.match(
      /<[^>]*\bclass\s*=\s*"[^"]*\bevent-row\b[^"]*"(?=[^>]*\bdata-cat\s*=\s*"([^"]*)")[^>]*\bdata-cat\s*=\s*"([^"]*)"[^>]*>/is
    )?.[2] ?? "";
  // data-title
  const dataTitle = (
    cardHtml.match(
      /<[^>]*\bclass\s*=\s*"[^"]*\bevent-row\b[^"]*"(?=[^>]*\bdata-title\s*=\s*"([^"]*)")[^>]*\bdata-title\s*=\s*"([^"]*)"[^>]*>/is
    )?.[2] ?? ""
  ).replace("-", "vs");
  // data-home-logo
  const dataHomeLogo =
    BASE_DOMAIN +
    (
      cardHtml.match(
        /<[^>]*\bclass\s*=\s*"[^"]*\bevent-row\b[^"]*"(?=[^>]*\bdata-home-logo\s*=\s*"([^"]*)")[^>]*\bdata-home-logo\s*=\s*"([^"]*)"[^>]*>/is
      )?.[2] ?? ""
    ).replaceAll("&amp;", "&");
  // data-away-logo
  const dataAwayLogo =
    BASE_DOMAIN +
    (
      cardHtml.match(
        /<[^>]*\bclass\s*=\s*"[^"]*\bevent-row\b[^"]*"(?=[^>]*\bdata-away-logo\s*=\s*"([^"]*)")[^>]*\bdata-away-logo\s*=\s*"([^"]*)"[^>]*>/is
      )?.[2] ?? ""
    ).replaceAll("&amp;", "&");
  // ==================== game-time ====================
  // time
  const gameTime = normalizeText(
    cardHtml.match(
      /<[^>]*\bclass\s*=\s*"[^"]*\bgame-time\b[^"]*"[^>]*>[\s\S]*?<b\b[^>]*>([\s\S]*?)<\/b>/i
    )?.[1] ?? ""
  );

  // date
  const gameDate = normalizeText(
    cardHtml.match(
      /<[^>]*\bclass\s*=\s*"[^"]*\bgame-time\b[^"]*"[^>]*>[\s\S]*?<span\b[^>]*>([\s\S]*?)<\/span>/i
    )?.[1] ?? ""
  );
  // ==================== league-logo & league-title ====================
  //league title
  const leagueTitle =
    cardHtml.match(
      /<[^>]*\bclass\s*=\s*"[^"]*\bleague-cell\b[^"]*"(?=[^>]*\btitle\s*=\s*"([^"]*)")[^>]*\btitle\s*=\s*"([^"]*)"[^>]*>/i
    )?.[2] ?? "";
  // src logo giải đấu
  const leagueLogo =
    BASE_DOMAIN +
    (
      cardHtml.match(
        /<img\b(?=[^>]*\bclass\s*=\s*"[^"]*\bleague-logo\b[^"]*")(?=[^>]*\bsrc\s*=\s*"([^"]*)")[^>]*>/i
      )?.[1] ?? ""
    ).replaceAll("&amp;", "&");
  // ==================== event-channels ====================
  // text b tag in class="stream-number"
  const channels =
    [
      ...cardHtml.matchAll(
        /<([a-z][\w:-]*)\b(?=[^>]*\bclass\s*=\s*(["'])[^"']*\bstream-number\b[^"']*\2)[^>]*>[\s\S]*?<b\b[^>]*>\s*([\s\S]*?)\s*<\/b>[\s\S]*?<\/\1>/gi
      )
    ].map((m) => normalizeText(m[3])) || [];

  if (!streamList[dataCat]) streamList[dataCat] = [];

  streamList[dataCat].push({
    dataCat,
    dataTitle,
    dataHomeLogo,
    dataAwayLogo,
    gameTime,
    gameDate,
    leagueTitle,
    leagueLogo,
    channels
  });
}

// const sourceOffset = { "UTC-12": -12, "UTC-11": -11, "UTC-10": -10, "UTC-9": -9, "UTC-8": -8, "UTC-7": -7, "UTC-6": -6, "UTC-5": -5, "UTC-4": -4, "UTC-3": -3, "UTC-2": -2, "UTC-1": -1, "UTC": 0, "UTC+1": 1, "UTC+2": 2, "UTC+3": 3, "UTC+4": 4, "UTC+5": 5, "UTC+6": 6, "UTC+7": 7, "UTC+8": 8, "UTC+9": 9, "UTC+10": 10, "UTC+11": 11, "UTC+12": 12, "UTC+13": 13, "UTC+14": 14 };
// format + convert time form UTC -6 -> UTC -> UTC +7 (GMT)   -360 = 6*360, -(-sourceOffset) = +sourceOffset
function formatGameDate(gameTime, gameDate, sourceOffset = -240) {
  gameTime = gameTime.trim().toUpperCase();
  gameDate = gameDate.trim();

  // Convert 12h -> 24h
  const [time, modifier] = gameTime.split(/\s+/);
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  const months = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11
  };

  const parts = gameDate.split(/\s+/);
  const month = months[parts[1].slice(0, 3).toLowerCase()];
  const day = Number(parts[2]);

  const year = new Date().getFullYear();

  // Convert source timezone -> UTC
  const utc =
    Date.UTC(year, month, day, hours, minutes) - sourceOffset * 60 * 1000;

  const date = new Date(utc);

  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const mo = String(date.getMonth() + 1).padStart(2, "0");

  return `${hh}:${mm}-${dd}/${mo}`;
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
          const dateTime = formatGameDate(stream.gameTime, stream.gameDate);
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
