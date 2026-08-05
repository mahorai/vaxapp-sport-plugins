// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
  return JSON.stringify({
    id: "xoilacz",
    name: "XOILACZ",
    version: "1.0.0",
    baseUrl: "https://xoilacz.io",
    iconUrl: "https://i.ibb.co/m5rVgxZB/xoilacz-plugin.png",
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
    { slug: "football", title: "FOOTBALL ⚽", type: "Horizontal", path: "" },
    { slug: "basketball", title: "BASKETBALL 🏀", type: "Horizontal", path: "" },
    { slug: "tennis", title: "TENNIS 🎾", type: "Horizontal", path: "" },
    { slug: "badminton", title: "BADMINTON 🏸", type: "Horizontal", path: "" },
    { slug: "volleyball", title: "VOLLEYBALL 🏐", type: "Horizontal", path: "" },
    { slug: "esports", title: "ESPORTS 🎮", type: "Horizontal", path: "" }
  ]);
}

function getPrimaryCategories() {
  return JSON.stringify([
    { name: "FOOTBALL", slug: "football" },
    { name: "BASKETBALL", slug: "basketball" },
    { name: "TENNIS", slug: "tennis" },
    { name: "BADMINTON", slug: "badminton" },
    { name: "VOLLEYBALL", slug: "volleyball" },
    { name: "ESPORTS", slug: "esports" }
  ]);
}

function getFilterConfig() {
  return JSON.stringify({ sort: [], category: [] });
}

// =============================================================================
// NHÓM 2: SINH URL (App gọi hàm → nhận URL → tự fetch HTTP)
// =============================================================================
// https://xoilacz.io/sport/{slug}/load-more/home/page/{page}/per/20
function getUrlList(slug, filtersJson) {
  try {
    filters = JSON.parse(filtersJson || "{}");
    const page = filters.page || 0;
    return `${BASE_DOMAIN}/sport/${slug}/load-more/home/page/${page}/per/20`;
  } catch (error) {
    console.error(
      "⛔ [getUrlList in xoilacz_plugin.js] ERROR MESSAGE: ",
      error
    );
    return BASE_DOMAIN;
  }
}

function getUrlSearch(keyword = "", filtersJson) {
  return BASE_DOMAIN;
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
    const data = JSON.parse(html).data;
    const items = [];

    const category = /sport\/([^/]+)\/load-more/i.exec(apiUrl)?.[1];
    if(category) { // sports category
      // <div class="grid-matches__item grid-matches__item-match....
      const cardPattern =
        /<div\b(?=[^>]*\bclass="[^"]*\bgrid-matches__item\b[^"]*")[^>]*>/gi;
      const cardsHTML = getCardsHTML(data.html, cardPattern);
  
      cardsHTML.forEach((cardHTML) => {
        const event = extractEvent(cardHTML, category);
        if (event) items.push(event);
      });
    } else { // replay and hightlight

    }

    return JSON.stringify({
      items: items,
      pagination: {
        currentPage: data.pagination.next_page - 1 || 0,
        totalPages: data.pagination.total_pages || 1
      }
    });
  } catch (error) {
    console.error(
      "⛔ [parseListResponse in xoilacz_plugin.js] ERROR MESSAGE: ",
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
    //get episodes name
    const regex = /<a\b[^>]*\bid="tv_link_\d+"[^>]*>([\s\S]*?)<\/a>/gi;
    const epsName = [...html.matchAll(regex)].map((m) =>
      m[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
    );
    //get episodes url (embed)
    const match = /var\s+list_stream\s*=\s*(\[\[.*?\]\]);/s.exec(html);
    const epsUrl = match ? JSON.parse(match[1].replace(/\\\//g, "/")) : [];
    var servers = [];
    const episodes = [];

    epsName.forEach((epName, index) => {
      if (epsUrl[index].length > 0)
        episodes.push({
          id: `${epsUrl[index][0]}/off-tvc?is_off_add=true`,
          name: epName,
          slug: `${epsUrl[index][0]}/off-tvc?is_off_add=true`
        });
    });
    if (episodes.length > 0) {
      servers.push({ name: "ADMIN", episodes: episodes });
      servers.push({
        name: "FALLBACK",
        episodes: JSON.parse(
          JSON.stringify(episodes).replaceAll("xlz", "xl365")
        )
      });
    }

    return JSON.stringify({
      id: apiUrl,
      title: data.title,
      posterUrl: data.posterUrl || FALLBACK_POSTER_URL,
      backdropUrl: data.posterUrl || FALLBACK_POSTER_URL,
      quality: "HD",
      episode_current: data.competition,
      description: `Event "${data.title}" is hosted on server XOILACZ`,
      servers: servers,
      lang: data.dateTime
    });
    return EMPTY_MOVIE_DETAIL;
  } catch (error) {
    console.error(
      "⛔ [parseMovieDetail in xoilacz_plugin.js] ERROR MESSAGE: ",
      error
    );
    return EMPTY_MOVIE_DETAIL;
  }
}

function parseDetailResponse(html, embedUrl) {
  console.log(
    "✅ [parseDetailResponse in xoilacz_plugin.js] embed url: ",
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
      "⛔ [parseDetailResponse in xoilacz_plugin.js] ERROR MESSAGE: ",
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

const BASE_DOMAIN = "https://xoilacz.io";
const FALLBACK_POSTER_URL = {
  football: [
    "https://i.ibb.co/rKHf363x/fallback-thumbnail.webp",
    "https://raw.githubusercontent.com/leeshin5757/getout/main/public/logo/night.webp",
    "https://raw.githubusercontent.com/leeshin5757/getout/main/public/logo/span1.webp",
    "https://raw.githubusercontent.com/leeshin5757/getout/main/public/logo/span2.webp",
    "https://raw.githubusercontent.com/leeshin5757/getout/main/public/logo/span3.webp",
    "https://raw.githubusercontent.com/leeshin5757/getout/main/public/logo/span4.webp",
    "https://raw.githubusercontent.com/leeshin5757/getout/main/public/logo/span8.webp",
    "https://raw.githubusercontent.com/leeshin5757/getout/main/public/logo/span6.webp",
    "https://raw.githubusercontent.com/leeshin5757/getout/main/public/logo/span7.webp"
  ],
  esports: [
    "https://i.ibb.co/39zgLHJB/esports01.webp",
    "https://i.ibb.co/PvYLdTrP/esports02.webp",
    "https://i.ibb.co/23pN01Sg/esports03.webp",
    "https://i.ibb.co/gbrBXrj9/esports04.webp",
    "https://i.ibb.co/ZpBZrNSB/esports05.webp",
    "https://i.ibb.co/rgXtyvk/esports06.webp",
    "https://i.ibb.co/VWNF427m/esports07.webp",
    "https://i.ibb.co/k6JCv685/esports08.webp",
    "https://i.ibb.co/d4yhPYRs/esports09.webp",
    "https://i.ibb.co/0jgzZYZv/esports10.webp"
  ],
  volleyball: [
    "https://i.ibb.co/HLCFW4TW/volleyball10.webp",
    "https://i.ibb.co/zW6ZgMD0/volleyball08.webp",
    "https://i.ibb.co/GvFDkrfx/volleyball09.webp",
    "https://i.ibb.co/Kz78JPSf/volleyball06.webp",
    "https://i.ibb.co/gMT3n0Zx/volleyball07.webp",
    "https://i.ibb.co/k651xCFP/volleyball05.webp",
    "https://i.ibb.co/27VWRVtT/volleyball03.webp",
    "https://i.ibb.co/zgFyZmh/volleyball04.webp",
    "https://i.ibb.co/6cXMDV0H/volleyball01.webp",
    "https://i.ibb.co/Q7V3Qyzq/volleyball02.webp"
  ],
  tennis: [
    "https://i.ibb.co/qFxFqsxc/tennis10.webp",
    "https://i.ibb.co/HL0TRtsS/tennis11.webp",
    "https://i.ibb.co/hRLKSg72/tennis08.webp",
    "https://i.ibb.co/qLPqcgYT/tennis09.webp",
    "https://i.ibb.co/HpMKtfCp/tennis07.webp",
    "https://i.ibb.co/Kxy2MphX/tennis05.webp",
    "https://i.ibb.co/qFpY8G5t/tennis06.webp",
    "https://i.ibb.co/jkzPWKmh/tennis02.webp",
    "https://i.ibb.co/Jj3y7qYc/tennis04.webp",
    "https://i.ibb.co/wDwdyVc/tennis01.webp"
  ],
  badminton: [
    "https://i.ibb.co/wFv7VyJR/badminton01.webp",
    "https://i.ibb.co/0yRnc4QP/badminton02.webp",
    "https://i.ibb.co/fzJJ4mfW/badminton03.webp",
    "https://i.ibb.co/3mHXYRgP/badminton04.webp",
    "https://i.ibb.co/XfnLqpyp/badminton05.webp",
    "https://i.ibb.co/mrdVk1Yw/badminton06.webp",
    "https://i.ibb.co/3YYGwhGw/badminton08.webp",
    "https://i.ibb.co/67ThRx5C/badminton09.webp",
    "https://i.ibb.co/N84r9k0/badminton10.webp",
    "https://i.ibb.co/278NkYmX/badminton11.webp"
  ],
  basketball: [
    "https://i.ibb.co/JwdhfXgv/basketball03.webp",
    "https://i.ibb.co/QFLHcLym/basketball04.webp",
    "https://i.ibb.co/kgQzwthq/basketball05.webp",
    "https://i.ibb.co/mV9XCp3J/basketball06.webp",
    "https://i.ibb.co/QF7XXf8Q/basketball07.webp",
    "https://i.ibb.co/LhX2jfSZ/basketball08.webp",
    "https://i.ibb.co/Nd8MTgZf/basketball09.webp",
    "https://i.ibb.co/gLY7DW4S/basketball10.webp",
    "https://i.ibb.co/qF3QmPf2/basketball01.webp",
    "https://i.ibb.co/R152phZ/basketball02.webp"
  ]
};
const EMPTY_MOVIE_DETAIL = JSON.stringify({
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

// ======================================
// FUNCTIONS
// ======================================

function extractParamFromUrl(url, param) {
  if (!url) return "";
  var match = url.match(new RegExp("[?&]" + param + "=([^&]+)"));
  return match ? decodeURIComponent(match[1]) : "";
}

function getCardsHTML(htmlContent, cardPattern) {
  let results = [];
  let match;

  while ((match = cardPattern.exec(htmlContent)) !== null) {
    let start = match.index;
    let pos = start + match[0].length;
    let count = 1;

    while (count > 0) {
      let open = htmlContent.indexOf("<div", pos);
      let close = htmlContent.indexOf("</div>", pos);

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

function extractEvent(cardHTML, category) {
  // get path and title
  let path = null;
  const tag = /<a\b[^>]*class="[^"]*\bredirectPopup\b[^"]*"[^>]*>/i.exec(
    cardHTML
  );
  if (!tag) return null;
  const hrefMatch = /href="([^"]+)"/i.exec(tag[0]);
  const titleMatch = /title="([^"]+)"/i.exec(tag[0]);
  path = hrefMatch[1];
  title = titleMatch[1];
  const res = parseTitle(title);

  // get competition
  const match =
    /<span\b(?=[^>]*\bclass="[^"]*\btext-ellipsis\b[^"]*")[^>]*>([\s\S]*?)<\/span>/i.exec(
      cardHTML
    );
  const competition = match ? match[1].trim() : "";
  // get dateTime
  // const match = /<div\b(?=[^>]*\bclass="[^"]*\bgrid-match__date\b[^"]*")[^>]*>([\s\S]*?)<\/div>/i.exec(cardHTML);
  // const dateTime = match ? match[1].trim() : "";
  // team logos
  // const regex =
  //   /<img\b(?=[^>]*\bclass="[^"]*\bteam-logo-\d+\b[^"]*")[^>]*\bsrc="([^"]+)"/gi;
  // const teamLogos = [...cardHTML.matchAll(regex)].map((match) => match[1]);
  const posterUrl =
    FALLBACK_POSTER_URL[category][
      Math.floor(Math.random() * FALLBACK_POSTER_URL[category].length)
    ];
  const encodedData = encodeURIComponent(
    JSON.stringify({
      title: res.title,
      competition,
      dateTime: isLive(res.dateTime) ? "LIVE" : res.dateTime,
      posterUrl
    })
  );

  return {
    id: `${path}|data:${encodedData}`,
    title: res.title,
    posterUrl: posterUrl || FALLBACK_POSTER_URL,
    backdropUrl: posterUrl || FALLBACK_POSTER_URL,
    quality: isLive(res.dateTime) ? "LIVE" : res.dateTime,
    episode_current: "HD",
    lang: competition
  };
}

function parseTitle(title) {
  const regex = /^(.*?)\s+lúc\s+(\d{2}:\d{2})\s+ngày\s+(\d{2}\/\d{2}\/\d{4})$/;
  const match = title.match(regex);

  if (!match) {
    return null;
  }

  return {
    title: match[1].trim(),
    dateTime: `${match[2]}-${match[3].substring(0, 5)}`
  };
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
