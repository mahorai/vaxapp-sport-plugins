// =============================================================================
// NHÓM 1: CẤU HÌNH (Config & Metadata)
// =============================================================================

function getManifest() {
  return JSON.stringify({
    id: "xoilacz",
    name: "XOILACZ",
    version: "1.0.6",
    baseUrl: BASE_DOMAIN,
    iconUrl: "https://i.ibb.co/m5rVgxZB/xoilacz-plugin.png",
    isEnabled: true,
    isAdult: false,
    type: "MOVIE",
    layoutType: "HORIZONTAL",
    playerType: "auto",
    debug: true
  });
}

function getHomeSections() {
  return JSON.stringify([
    { slug: "football", title: "Football ⚽", type: "Horizontal", path: "" },
    { slug: "basketball", title: "Basketball 🏀", type: "Horizontal", path: "" },
    { slug: "tennis", title: "Tennis 🎾", type: "Horizontal", path: "" },
    { slug: "badminton", title: "Badminton 🏸", type: "Horizontal", path: "" },
    { slug: "volleyball", title: "Volleyball 🏐", type: "Horizontal", path: "" },
    { slug: "esports", title: "Esports 🎮", type: "Horizontal", path: "" },
    { slug: "highlight", title: "Highlight 🎉", type: "Horizontal", path: "" },
    { slug: "video", title: "Replay 🎞️", type: "Horizontal", path: "" }
  ]);
}

function getPrimaryCategories() {
  return JSON.stringify([
    { name: "Football", slug: "football" },
    { name: "Basketball", slug: "basketball" },
    { name: "Tennis", slug: "tennis" },
    { name: "Badminton", slug: "badminton" },
    { name: "Volleyball", slug: "volleyball" },
    { name: "Esports", slug: "esports" },
    { name: "Highlight", slug: "highlight" },
    { name: "Replay", slug: "video" }
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
    if (slug === "video" || slug === "highlight") {
      const page = filters.page || 1;
      return `${BASE_DOMAIN}/${slug}/page/${page}`;
    } else {
      const page = filters.page || 0;
      return `${BASE_DOMAIN}/sport/${slug}/load-more/home/page/${page}/per/20?t=${Math.floor(Date.now() / 1000)}`;
    }
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
    const items = [];
    let currentPage, totalPages, pattern;
    let category = /sport\/([^/]+)\/load-more/i.exec(apiUrl)?.[1];

    if (category) {
      // sports category
      const data = JSON.parse(html).data;
      // <div class="grid-matches__item grid-matches__item-match....
      pattern =
        /<div\b(?=[^>]*\bclass="[^"]*\bgrid-matches__item-match\b[^"]*")[^>]*>/gi;
      const cardsHtml = extractCardsHtml(data.html, pattern, "div");

      cardsHtml.forEach((cardHtml) => {
        const event = extractItem(cardHtml, category);
        if (event) items.push(event);
      });
      currentPage = data.pagination.next_page - 1 || 0;
      totalPages = data.pagination.total_pages || 1;
    } else {
      // replay and hightlight
      let match;
      category = /^https?:\/\/[^\/]+\/([^\/?#]+)/i.exec(apiUrl)?.[1];
      if (category === "video")
        pattern =
          /<article class="video-match-card[^"]*">[\s\S]*?<\/article>/gi;
      else if (category === "highlight")
        pattern =
          /<div(?=[^>]*\bclass="[^"]*\bpost-item-image\b[^"]*")[^>]*>[\s\S]*?<\/div>/gi;
      while ((match = pattern.exec(html)) !== null) {
        const video = extractItem(match[0], category);
        if (video) items.push(video);
      }
      // solve pagination
      // get current page
      pattern = /\/page\/(\d+)\/?$/i;
      match = apiUrl.match(pattern);
      currentPage = match ? match[1] : 1;
      // get totalPage form href from a tag class="last" and aria-label="Last Page" ,
      pattern =
        /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\blast\b[^"']*["'])(?=[^>]*\baria-label\s*=\s*["']Last Page["'])(?=[^>]*\bhref\s*=\s*["']([^"']+)["'])[^>]*>/i;
      match = html.match(pattern);
      const lastPageHref = match ? match[1] : "";

      pattern = /\/page\/(\d+)\/?$/i;
      match = lastPageHref.match(pattern);
      totalPages = match ? match[1] : 1;
    }

    return JSON.stringify({
      items: items,
      pagination: {
        currentPage,
        totalPages
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

function parseMovieDetail(html, apiUrl, datasend) {
  try {
    const data = JSON.parse(decodeURIComponent(getPipeData(datasend)));
    var servers = [];
    const episodes = [];
    const isEvent = apiUrl.includes("truc-tiep");

    if (!isEvent) {
      let mediaPattern =
        /https?:\/\/[^\s"'<>]+?\.(?:m3u8|mp4)(?:\?[^"'<>]*)?/gi;
      const mediaLinks = html.match(mediaPattern) || [];
      if (mediaLinks.length === 0) {
        const mediaPattern =
          /<iframe\b(?=[^>]*\bsrc\s*=\s*["']([^"']+)["'])[^>]*>/gi;
        let match;
        while ((match = mediaPattern.exec(html)) !== null)
          mediaLinks.push(match[1]);
      }

      pattern =
        /<button\b(?=[^>]*\bid\s*=\s*["']tv_link_[^"']*["'])[^>]*>([\s\S]*?)<\/button>/gi;
      const commentators = [...html.matchAll(pattern)].map((match) =>
        match[1]
          .replace(/<svg[\s\S]*?<\/svg>/gi, "")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim()
      );
      const isVideo = Array.isArray(commentators) && commentators.length > 0;
      mediaLinks.forEach((mediaLink, index) => {
        episodes.push({
          id: mediaLink,
          name: !isVideo
            ? "FULL - 0" + (index + 1)
            : "BLV " + commentators[index],
          slug: mediaLink
        });
      });
      servers.push({ name: "ADMIN", episodes: episodes });
    } else {
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
    }

    return JSON.stringify({
      id: apiUrl,
      title: data.title,
      posterUrl: data.posterUrl || FALLBACK_POSTER_URL.football[1],
      backdropUrl: data.posterUrl || FALLBACK_POSTER_URL.football[1],
      quality: data.quality,
      episode_current: data.episode_current,
      description: `Event "${data.title}" is hosted on server XOILACZ`,
      servers: servers,
      lang: data.lang
    });
    return EMPTY_ITEM_DETAIL;
  } catch (error) {
    console.error(
      "⛔ [parseMovieDetail in xoilacz_plugin.js] ERROR MESSAGE: ",
      error
    );
    return EMPTY_ITEM_DETAIL;
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
const EMPTY_ITEM_DETAIL = JSON.stringify({
  id: "",
  title: "⚠️ Stream Link Not Found!",
  posterUrl: FALLBACK_POSTER_URL.football[1],
  backdropUrl: FALLBACK_POSTER_URL.football[1],
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

function extractItem(cardHtml, category) {
  let match,
    pattern,
    id,
    title,
    posterUrl,
    quality = "",
    episode_current = "",
    lang = "",
    encodedData;

  if (category === "video") {
    // get href from class="video-match-card__thumb"
    pattern =
      /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bvideo-match-card__thumb\b[^"']*["'])(?=[^>]*\bhref\s*=\s*["']([^"']+)["'])[^>]*>/i;
    match = cardHtml.match(pattern);
    id = match ? match[1] : "";

    // get src and alt from img tag
    pattern =
      /<img\b(?=[^>]*\bsrc\s*=\s*["']([^"']+)["'])(?=[^>]*\balt\s*=\s*["']([^"']+)["'])[^>]*>/i;
    match = cardHtml.match(pattern);
    posterUrl = match ? match[1] : "";
    title = match ? match[2] : "";
    title = title.replace(/&amp;/g, "&").replace(/&#8211;/g, "–");

    // get text from class="video-match-card__badge--type"
    pattern =
      /<span\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bvideo-match-card__badge--type\b[^"']*["'])[^>]*>([\s\S]*?)<\/span>/i;
    match = cardHtml.match(pattern);
    const badgeType = match ? match[1].replace(/<[^>]+>/g, "").trim() : "";

    // get text from class="video-match-card__badge--time"
    pattern =
      /<span\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bvideo-match-card__badge--time\b[^"']*["'])[^>]*>([\s\S]*?)<\/span>/i;
    match = cardHtml.match(pattern);
    const badgeTime = match ? match[1].replace(/<[^>]+>/g, "").trim() : "";

    lang = badgeType + " - " + badgeTime;
    // get text from class="video-match-card__commentator"
    pattern =
      /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bvideo-match-card__commentator\b[^"']*["'])[^>]*>([\s\S]*?)<\/a>/i;
    match = cardHtml.match(pattern);
    episode_current =
      "BLV " +
      (match
        ? match[1]
            .replace(/<svg[\s\S]*?<\/svg>/gi, "")
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim()
        : "");

    // get text from class="video-match-card__view"
    pattern =
      /<span\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bvideo-match-card__view\b[^"']*["'])[^>]*>([\s\S]*?)<\/span>/i;
    match = cardHtml.match(pattern);
    quality = match
      ? match[1]
          .replace(/<svg[\s\S]*?<\/svg>/gi, "")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim()
      : "";
  } else if (category === "highlight") {
    // get event highlights
    // get href from a tag
    pattern = /<a\b(?=[^>]*\bhref\s*=\s*["']([^"']+)["'])[^>]*>/i;
    match = cardHtml.match(pattern);
    id = match ? match[1] : "";
    // get src and alt from img tag
    pattern =
      /<img\b(?=[^>]*\bsrc\s*=\s*["']([^"']+)["'])(?=[^>]*\balt\s*=\s*["']([^"']+)["'])[^>]*>/i;
    match = cardHtml.match(pattern);
    posterUrl = match ? match[1] : FALLBACK_POSTER_URL.football[1];
    title = match ? match[2].split("|")[0].trim() : "";
    title = title.replace(/&amp;/g, "&").replace(/&#8211;/g, "–");
    quality = "HIGHLIGHTS";
    lang = "HIGHLIGHTS TRẬN ĐẤU";
    episode_current = "HD";
  } else {
    // event live
    // get href and title
    pattern =
      /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bredirectPopup\b[^"']*["'])(?=[^>]*\bhref\s*=\s*["']([^"']+)["'])(?=[^>]*\btitle\s*=\s*["']([^"']+)["'])[^>]*>/i;
    match = cardHtml.match(pattern);
    id = match ? match[1] : "";
    const data = parseTitle(match[2] || "");
    // get competition
    match =
      /<span\b(?=[^>]*\bclass="[^"]*\btext-ellipsis\b[^"]*")[^>]*>([\s\S]*?)<\/span>/i.exec(
        cardHtml
      );
    lang = match ? match[1].trim() : "";
    posterUrl =
      FALLBACK_POSTER_URL[category][
        Math.floor(Math.random() * FALLBACK_POSTER_URL[category].length)
      ];
    title = data.title;
    quality = isLive(data.dateTime) ? "LIVE" : data.dateTime;
    pattern =
      /<a\b[^>]*\bclass\s*=\s*["'][^"']*\bcommentator\b[^"']*["'][^>]*>[\s\S]*?<span\b[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/a>/gi;
    episode_current = [...cardHtml.matchAll(pattern)].map((match) =>
      match[1]
        .replace(/<svg[\s\S]*?<\/svg>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
    );
    episode_current =
      episode_current.length > 0 ? `BLV ${episode_current.join(", ")}` : "HD";
  }

  encodedData = encodeURIComponent(
    JSON.stringify({
      title,
      lang,
      posterUrl,
      lang,
      quality,
      episode_current
    })
  );

  return {
    id: `${id}|data:${encodedData}`,
    title,
    posterUrl,
    backdropUrl: posterUrl,
    lang,
    quality,
    episode_current
  };
}

function parseTitle(title) {
  if (!title) return {};
  const regex = /^(.*?)\s+lúc\s+(\d{2}:\d{2})\s+ngày\s+(\d{2}\/\d{2}\/\d{4})$/;
  const match = title.match(regex);

  if (!match) {
    return {};
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

function getPipeData(datasend) {
  if (!datasend) return "";
  // Remove the prefix "data:" if present (case-insensitive)
  if (datasend.toLowerCase().indexOf("data:") === 0) return datasend.substring(5);
  return datasend;
}
