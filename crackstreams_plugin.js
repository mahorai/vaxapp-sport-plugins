// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
  return JSON.stringify({
    id: "crackstreams",
    name: "CrackStreams",
    version: "1.0.0",
    baseUrl: "https://crackstreams.mx",
    iconUrl: "https://i.ibb.co/Mxg5183D/crackstreams-logo.png",
    isEnabled: true,
    isAdult: false,
    type: "MOVIE",
    layoutType: "HORIZONTAL",
    playerType: "embedtoexoplay",
    debug: true
  });
}

function getHomeSections() {
  return JSON.stringify([
    { slug: "mmastreams", title: "MMA Streams 🥊", type: "Horizontal", path: "" },
    { slug: "boxingcasino", title: "Boxing Streams 🥊", type: "Horizontal", path: "" },
    { slug: "nflstreams", title: "NFL Streams 🏈", type: "Horizontal", path: "" },
    { slug: "nbaregular66", title: "NBA Streams 🏀", type: "Horizontal", path: "" },
    { slug: "mlbwildcard", title: "MLB Streams ⚾", type: "Horizontal", path: "" },
    { slug: "wnbastreams", title: "WNBA Streams 🏀", type: "Horizontal", path: "" },
    { slug: "f1streams", title: "F1 Streams 🏎️", type: "Horizontal", path: "" },
    { slug: "nhlstreams", title: "NHL Streams 🏒", type: "Horizontal", path: "" },
    { slug: "ncaab", title: "NCAAB Streams 🏀", type: "Horizontal", path: "" },
    { slug: "ncaa", title: "NCAA Streams 🏀", type: "Horizontal", path: "" },
    { slug: "wwestreams", title: "WWE Streams 🤼", type: "Horizontal", path: "" }
  ]);
}

function getPrimaryCategories() {
  return JSON.stringify([
    { name: "NFL Streams", slug: "nflstreams" },
    { name: "MMA Streams", slug: "mmastreams" },
    { name: "Boxing Streams", slug: "boxingcasino" },
    { name: "NBA Streams", slug: "nbaregular66" },
    { name: "MLB Streams", slug: "mlbwildcard" },
    { name: "WNBA Streams", slug: "wnbastreams" },
    { name: "F1 Streams", slug: "f1streams" },
    { name: "NHL Streams", slug: "nhlstreams" },
    { name: "NCAAB Streams", slug: "ncaab" },
    { name: "NCAAB Streams", slug: "ncaa" },
    { name: "WWE Streams", slug: "wwestreams" }
  ]);
}

function getFilterConfig() {
  return JSON.stringify({ sort: [], category: [] });
}

// =============================================================================
// NHÓM 2: SINH URL (App gọi hàm → nhận URL → tự fetch HTTP)
// =============================================================================
function getUrlList(slug, filtersJson) {
  return `${BASE_DOMAIN}/league/${slug}`;
}

function getUrlSearch(keyword = "", filtersJson) {
  return `${BASE_DOMAIN}/league?search=${encodeURIComponent(keyword?.trim())}`;
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
    const category = apiUrl.substring(apiUrl.indexOf("/league/") + 8);
    const keyword = extractParamFromUrl(apiUrl, "search");

    if (!keyword && !streamList[category]) {
      // get dataDate
      const dataDates = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map(
        (m) => normalizeText(m[1])
      );
      // get card html class card
      pattern = /<a\b(?=[^>]*\bclass="[^"]*\bcard\b[^"]*")[^>]*>/gi;
      const cardsHtml = extractCardsHtml(html, pattern, "a");
      // extract item
      cardsHtml.forEach((cardHtml) => {
        extractItem(cardHtml, category, dataDates);
      });
    }
    let streams = null;
    const items = [];

    if (keyword) streams = filterStreams(streamList, ["search", keyword]);
    else if (category) streams = streamList[category] || [];
    streams.forEach((stream, index) => {
      const dateTime = formatDateTime(stream.dataDate, stream.dataTime);
      const tLInfo = isLive(dateTime) ? "LIVE" : dateTime;
      const encodedData = encodeURIComponent(
        JSON.stringify({
          title: stream.dataTitle,
          posterUrl: stream.dataLogo,
          backdropUrl: stream.dataLogo,
          description: `Event "${stream.dataTitle}" is hosted on server CrackStreams`,
          quality: tLInfo,
          episode_current: "HD",
          lang: stream.dataCat.toUpperCase()
        })
      );

      items.push({
        id: `${BASE_DOMAIN}${stream.dataPath}|data:${encodedData}`,
        title: stream.dataTitle,
        posterUrl: stream.dataLogo,
        backdropUrl: stream.dataLogo,
        quality: tLInfo,
        episode_current: "HD",
        lang: stream.dataCat.toUpperCase()
      });
    });

    return JSON.stringify({
      items: items,
      pagination: { currentPage: 1, totalPages: 1 }
    });
  } catch (error) {
    console.error(
      "⛔ [parseListResponse in crackstreams_plugin.js] ERROR MESSAGE: ",
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
    // case 1:get allStreams = [{label, value}] - JS
    // const streams = (() => {
    //   const value =
    //     (html.match(/allstreams\s*=\s*(\[[\s\S]*?\])\s*;?/i) || [])[1] || "";
    //   return value ? Function("return " + value)() : [];
    // })();
    // case 2: get allStreams = [{"label", "value"}] - JSON
    const streams = (() => {
      const value =
        (html.match(/allstreams\s*=\s*(\[[\s\S]*?\])\s*;?/i) || [])[1] || "";
      return value ? JSON.parse(value) : [];
    })();

    if (streams.length === 0) return EMPTY_ITEM_DETAIL;
    const data = JSON.parse(decodeURIComponent(getPipeData(apiUrl)));
    const episodes = [];

    streams.forEach((stream, index) => {
      episodes.push({
        id: stream.value,
        name: stream.label || `Link ${i + 1} HD`,
        slug: `${apiUrl.split("|")[0].substring(apiUrl.indexOf("/stream/") + 7)}-${index + 1}`
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
      "⛔ [parseMovieDetail in crackstreams_plugin.js] ERROR MESSAGE: ",
      error
    );
    return EMPTY_ITEM_DETAIL;
  }
}

function parseDetailResponse(html, embedUrl) {
  console.log(
    "✅ [parseDetailResponse in crackstreams_plugin.js] embed url: ",
    embedUrl
  );
  try {
    return JSON.stringify({
      isEmbed: true,
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
      "⛔ [parseDetailResponse in crackstreams_plugin.js] ERROR MESSAGE: ",
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

const BASE_DOMAIN = "https://crackstreams.mx";
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

function extractItem(cardHtml, category, dataDates) {
  // href của thẻ <a class="card">
  const dataPath =
    (cardHtml.match(
      /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bcard\b[^"']*")(?=[^>]*\bhref\s*=\s*["']([^"']*)["'])[^>]*>/i
    ) || [])[1] || "";
  // src của thẻ <img>
  const dataLogo =
    (cardHtml.match(/<img\b(?=[^>]*\bsrc\s*=\s*["']([^"']*)["'])[^>]*>/i) ||
      [])[1] || "";
  // text của phần tử có class="card-title"
  const dataTitle = normalizeText(
    (
      (cardHtml.match(
        /<([a-z0-9]+)\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bcard-title\b[^"']*")[^>]*>([\s\S]*?)<\/\1>/i
      ) || [])[2] || ""
    ).replaceAll("&amp;", "&")
  );
  // text của phần tử có class="card-subtitle"
  const dataTime = normalizeText(
    (cardHtml.match(
      /<([a-z0-9]+)\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bcard-subtitle\b[^"']*")[^>]*>([\s\S]*?)<\/\1>/i
    ) || [])[2] || ""
  );
  if (!streamList[category]) streamList[category] = [];

  streamList[category].push({
    dataPath,
    dataLogo,
    dataTitle,
    dataTime,
    dataDate: dataDates[0],
    dataCat: category
  });
}

function formatDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return "00:00-00/00";
  // Chuẩn hóa input
  dateStr = String(dateStr || "")
    .trim()
    .toLowerCase();
  timeStr = String(timeStr || "")
    .trim()
    .toLowerCase();
  // Parse ngày: Friday, August 7, 2026
  var m = dateStr.match(/([a-z]+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return "";
  var months = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11
  };
  var month = months[m[1]];

  if (month === undefined) return "";
  var day = parseInt(m[2], 10);
  var year = parseInt(m[3], 10);

  // Parse giờ:
  // Start time: 6:40 PM ET
  // 6:40 pm et
  var t = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);

  if (!t) return "";
  var hour = parseInt(t[1], 10);
  var minute = parseInt(t[2], 10);
  var ap = t[3];

  if (ap === "pm" && hour !== 12) hour += 12;
  if (ap === "am" && hour === 12) hour = 0;

  // ===== Tính DST của Eastern Time =====
  function nthSunday(year, month, nth) {
    var d = new Date(Date.UTC(year, month, 1));
    var firstSunday = 1 + ((7 - d.getUTCDay()) % 7);
    return firstSunday + (nth - 1) * 7;
  }
  var secondSundayMarch = nthSunday(year, 2, 2);
  var firstSundayNovember = nthSunday(year, 10, 1);
  var current = month * 100 + day;
  var start = 2 * 100 + secondSundayMarch;
  var end = 10 * 100 + firstSundayNovember;
  // EDT = UTC-4, EST = UTC-5
  var utcOffset = current >= start && current < end ? -4 : -5;
  // ET -> UTC
  var utcMillis = Date.UTC(year, month, day, hour - utcOffset, minute, 0, 0);
  // UTC -> Local timezone của thiết bị
  var local = new Date(utcMillis);

  function pad(v) {
    return v < 10 ? "0" + v : "" + v;
  }

  return (
    pad(local.getHours()) +
    ":" +
    pad(local.getMinutes()) +
    "-" +
    pad(local.getDate()) +
    "/" +
    pad(local.getMonth() + 1)
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
  // filter streams by search
  if (filterValue && filterKey === "search") {
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
