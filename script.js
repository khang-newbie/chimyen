// Firebase Configuration
const firebaseConfig = {
  databaseURL:
    "https://radar-swiftlet-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===== DISPLAY VALUES =====
const chimVaoRef = db.ref("tong_vao");
chimVaoRef.on("value", (snapshot) => {
  const value = snapshot.val() || 0;
  document.querySelectorAll(".big-number")[0].innerText = value;
});

const chimRaRef = db.ref("tong_ra");
chimRaRef.on("value", (snapshot) => {
  const value = snapshot.val() || 0;
  document.querySelectorAll(".big-number")[1].innerText = value;
});

db.ref("/").on("value", (snapshot) => {
  const data = snapshot.val() || {};
  const vao = data.tong_vao || 0;
  const ra = data.tong_ra || 0;
  const tong = vao - ra;
  document.querySelectorAll(".big-number")[2].innerText = tong;
});

// ===== PAGE NAVIGATION =====
function showPage(pageId) {
  document.querySelectorAll(".page").forEach((p) => {
    p.style.display = "none";
  });

  const activePage = document.getElementById(pageId);
  activePage.style.display = "block";

  if (pageId === "stats") {
    initStatsDateSelects();
    if (statsChart) {
      setTimeout(() => {
        statsChart.resize();
      }, 200);
    }
  }
}

// ===== CHARTS =====
let lineChart;

function drawChart(hours, vao, ra) {
  const ctx = document.getElementById("lineChart");

  if (lineChart) {
    lineChart.destroy();
  }

  lineChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: hours,
      datasets: [
        {
          label: "Chim vào",
          data: vao,
          borderColor: "#00d4ff",
          backgroundColor: "rgba(0,212,255,0.15)",
          tension: 0.4,
          fill: true,
          pointRadius: 4,
        },
        {
          label: "Chim ra",
          data: ra,
          borderColor: "#ff4444",
          backgroundColor: "rgba(255,68,68,0.15)",
          tension: 0.4,
          fill: true,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#e2e8f0",
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255,255,255,0.05)",
            drawBorder: false,
          },
          ticks: {
            color: "#94a3b8",
          },
          title: {
            display: true,
            text: "Thời gian (giờ)",
            font: { size: 15, weight: "bold" },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(255,255,255,0.08)",
            drawBorder: false,
          },
          ticks: {
            color: "#94a3b8",
          },
          title: {
            display: true,
            text: "Số lượng chim",
            font: { size: 15, weight: "bold" },
          },
        },
      },
    },
  });
}

function drawMonthChart(vao, ra, tong) {
  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: [
        "T1",
        "T2",
        "T3",
        "T4",
        "T5",
        "T6",
        "T7",
        "T8",
        "T9",
        "T10",
        "T11",
        "T12",
      ],
      datasets: [
        {
          label: "Chim vào",
          data: vao,
          backgroundColor: "rgba(0,200,0,0.7)",
          borderRadius: 6,
        },
        {
          label: "Chim ra",
          data: ra,
          backgroundColor: "rgba(255,0,0,0.7)",
          borderRadius: 6,
        },
        {
          label: "Tổng",
          data: tong,
          backgroundColor: "rgba(255,200,0,0.8)",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#e2e8f0",
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255,255,255,0.05)",
            drawBorder: false,
          },
          ticks: {
            color: "#94a3b8",
          },
          title: {
            display: true,
            text: "Tháng",
            font: { size: 15, weight: "bold" },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(255,255,255,0.08)",
            drawBorder: false,
          },
          ticks: {
            color: "#94a3b8",
          },
          title: {
            display: true,
            text: "Số lượng chim",
            font: { size: 15, weight: "bold" },
          },
        },
      },
    },
  });
}

// ===== LOAD DAILY CHART (REAL-TIME) =====
function loadChart() {
  let today = new Date().toISOString().split("T")[0];

  const hours = [];
  const vao = new Array(24).fill(0);
  const ra = new Array(24).fill(0);

  for (let h = 0; h <= 23; h++) {
    let hour = h.toString().padStart(2, "0");
    let index = h;
    hours[index] = hour + ":00";
  }

  // Vẽ biểu đồ ngay với dữ liệu trống
  if (!lineChart) {
    drawChart(hours, vao, ra);
  }

  // Lắng nghe từng giờ theo real-time
  for (let h = 0; h <= 23; h++) {
    let hour = h.toString().padStart(2, "0");
    let index = h;

    db.ref("bird_data/" + today + "/" + hour).on("value", (snapshot) => {
      let data = snapshot.val() || {};

      vao[index] = data.vao || 0;
      ra[index] = data.ra || 0;

      // Cập nhật biểu đồ ngay mà không phải chờ tất cả dữ liệu
      if (lineChart) {
        lineChart.data.datasets[0].data = vao;
        lineChart.data.datasets[1].data = ra;
        lineChart.update("none"); // Cập nhật mà không có animation
      }

      // Cập nhật tổng vào/ra trong Firebase
      const todayVao = vao.reduce((sum, val) => sum + (val || 0), 0);
      const todayRa = ra.reduce((sum, val) => sum + (val || 0), 0);
      db.ref("tong_vao").set(todayVao);
      db.ref("tong_ra").set(todayRa);
    });
  }
}

loadChart();

// ===== LOAD MONTHLY CHART (OPTIMIZED REAL-TIME) =====
let barChart;
let monthData = {
  vao: new Array(12).fill(0),
  ra: new Array(12).fill(0),
  tong: new Array(12).fill(0),
};
let monthDailyCache = {}; // Lưu dữ liệu ngày để tính tháng chính xác

function loadMonthChart() {
  const currentYear = new Date().getFullYear();
  let processedMonths = 0;

  // Chỉ tải dữ liệu của năm hiện tại
  for (let m = 0; m < 12; m++) {
    const month = String(m + 1).padStart(2, "0");

    // Tìm tất cả ngày trong tháng của năm hiện tại
    db.ref("bird_data")
      .orderByKey()
      .startAt(`${currentYear}-${month}-01`)
      .endAt(`${currentYear}-${month}-31`)
      .once("value")
      .then((snapshot) => {
        const dates = snapshot.val() || {};

        let monthVao = 0;
        let monthRa = 0;

        for (let date in dates) {
          monthDailyCache[date] = { vao: 0, ra: 0 };
          const hours = dates[date] || {};
          for (let hour in hours) {
            monthVao += hours[hour].vao || 0;
            monthRa += hours[hour].ra || 0;
            monthDailyCache[date].vao += hours[hour].vao || 0;
            monthDailyCache[date].ra += hours[hour].ra || 0;
          }
        }

        monthData.vao[m] = monthVao;
        monthData.ra[m] = monthRa;
        monthData.tong[m] = monthVao - monthRa;

        processedMonths++;

        // Vẽ/cập nhật biểu đồ khi có dữ liệu đủ
        if (!barChart) {
          drawMonthChart(monthData.vao, monthData.ra, monthData.tong);
        } else {
          barChart.data.datasets[0].data = monthData.vao;
          barChart.data.datasets[1].data = monthData.ra;
          barChart.data.datasets[2].data = monthData.tong;
          barChart.update("none"); // Cập nhật mà không có animation
        }
      });
  }

  // Lắng nghe dữ liệu mới hôm nay để cập nhật real-time
  const today = new Date().toISOString().split("T")[0];
  const todayMonth = new Date().getMonth();

  db.ref(`bird_data/${today}`).on("value", (snapshot) => {
    const hours = snapshot.val() || {};
    let todayVao = 0;
    let todayRa = 0;

    for (let hour in hours) {
      todayVao += hours[hour].vao || 0;
      todayRa += hours[hour].ra || 0;
    }

    // Nếu đã có cache cho hôm nay, trừ đi giá trị cũ
    if (monthDailyCache[today]) {
      monthData.vao[todayMonth] -= monthDailyCache[today].vao;
      monthData.ra[todayMonth] -= monthDailyCache[today].ra;
    }

    // Thêm dữ liệu mới
    monthData.vao[todayMonth] += todayVao;
    monthData.ra[todayMonth] += todayRa;
    monthData.tong[todayMonth] =
      monthData.vao[todayMonth] - monthData.ra[todayMonth];

    // Cập nhật cache
    monthDailyCache[today] = { vao: todayVao, ra: todayRa };

    if (barChart) {
      barChart.data.datasets[0].data[todayMonth] = monthData.vao[todayMonth];
      barChart.data.datasets[1].data[todayMonth] = monthData.ra[todayMonth];
      barChart.data.datasets[2].data[todayMonth] = monthData.tong[todayMonth];
      barChart.update("none");
    }
  });
}

loadMonthChart();

// ===== STATISTICS =====
function formatDateVN(dateStr) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function initStatsDateSelects() {
  const fromDay = document.getElementById("fromDay");
  const fromMonth = document.getElementById("fromMonth");
  const fromYear = document.getElementById("fromYear");
  const toDay = document.getElementById("toDay");
  const toMonth = document.getElementById("toMonth");
  const toYear = document.getElementById("toYear");
  if (!fromDay || !fromMonth || !fromYear || !toDay || !toMonth || !toYear)
    return;

  const current = new Date();
  const currentYear = current.getFullYear();
  const monthOptions = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  );

  function populateYear(select) {
    if (select.options.length > 0) return;
    for (let offset = -3; offset <= 3; offset++) {
      const year = currentYear + offset;
      const option = document.createElement("option");
      option.value = year.toString();
      option.text = year.toString();
      select.appendChild(option);
    }
  }

  function populateMonth(select) {
    if (select.options.length > 0) return;
    monthOptions.forEach((m) => {
      const option = document.createElement("option");
      option.value = m;
      option.text = m;
      select.appendChild(option);
    });
  }

  function populateDay(select, year, month) {
    select.innerHTML = "";
    const days = new Date(year, month, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const option = document.createElement("option");
      option.value = String(d).padStart(2, "0");
      option.text = String(d).padStart(2, "0");
      select.appendChild(option);
    }
  }

  populateYear(fromYear);
  populateYear(toYear);
  populateMonth(fromMonth);
  populateMonth(toMonth);

  if (!fromYear.value) fromYear.value = currentYear;
  if (!fromMonth.value)
    fromMonth.value = String(current.getMonth() + 1).padStart(2, "0");
  if (!toYear.value) toYear.value = currentYear;
  if (!toMonth.value)
    toMonth.value = String(current.getMonth() + 1).padStart(2, "0");

  populateDay(fromDay, fromYear.value, fromMonth.value);
  populateDay(toDay, toYear.value, toMonth.value);

  fromYear.onchange = () =>
    populateDay(fromDay, fromYear.value, fromMonth.value);
  fromMonth.onchange = () =>
    populateDay(fromDay, fromYear.value, fromMonth.value);
  toYear.onchange = () => populateDay(toDay, toYear.value, toMonth.value);
  toMonth.onchange = () => populateDay(toDay, toYear.value, toMonth.value);

  if (!fromDay.value)
    fromDay.value = String(current.getDate()).padStart(2, "0");
  if (!toDay.value) toDay.value = String(current.getDate()).padStart(2, "0");
}

function toggleStatsDatePanel() {
  const panel = document.getElementById("statsDatePanel");
  if (!panel) return;
  initStatsDateSelects();
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

function getStatsDate(prefix) {
  const day = document.getElementById(`${prefix}Day`).value;
  const month = document.getElementById(`${prefix}Month`).value;
  const year = document.getElementById(`${prefix}Year`).value;
  return day && month && year ? `${year}-${month}-${day}` : "";
}

function loadStats() {
  const fromDate = getStatsDate("from");
  const toDate = getStatsDate("to");

  const table = document.getElementById("statsTable");
  table.innerHTML = "";

  if (!fromDate || !toDate) {
    alert("Vui lòng chọn ngày!");
    return;
  }

  let currentTotal = 0;

  db.ref("bird_data")
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();

      for (let date in data) {
        if (date >= fromDate && date <= toDate) {
          const hours = data[date];

          for (let hour in hours) {
            const vao = hours[hour].vao || 0;
            const ra = hours[hour].ra || 0;

            currentTotal += vao - ra;

            table.innerHTML += `
          <tr>
            <td>${formatDateVN(date)}</td>
            <td>${hour}:00</td>
            <td>${vao}</td>
            <td>${ra}</td>
            <td>${currentTotal}</td>
          </tr>
          `;
          }
        }
      }
    });
}

function exportToExcel() {
  const table = document.querySelector("table");
  const workbook = XLSX.utils.table_to_book(table, {
    sheet: "ThongKeNhaYen",
  });

  XLSX.writeFile(workbook, "ThongKeNhaYen.xlsx");
}

// ===== SUPPORT =====
function sendEmail() {
  let now = new Date().toLocaleString();

  let body =
    "Mô tả lời:\n\n\n" +
    "----------------------\n" +
    "Thời gian: " +
    now +
    "\n" +
    "Hệ thống: Nhà Yến IoT";

  window.location.href =
    "mailto:khangb2204563@stuent.ctu.edu.vn,duyb2204543@stuent.ctu.edu.vn?subject=Hỗ trợ hệ thống&body=" +
    encodeURIComponent(body);
}

// ===== CONNECTION & THRESHOLD =====
function updateThresholdValue(val) {
  document.getElementById("thresholdValue").innerText = val;
}

function saveThreshold() {
  const value = document.getElementById("thresholdSlider").value;
  db.ref("config/threshold").set(parseInt(value));
}

function saveWifiConfig() {
  const ssid = document.getElementById("wifiSsid").value.trim();
  const pass = document.getElementById("wifiPass").value;

  if (!ssid) {
    alert("Vui lòng nhập SSID WiFi.");
    return;
  }

  db.ref("config/wifi").set({ ssid, pass });
  document.getElementById("wifiStatusText").innerText = "Đã lưu cấu hình WiFi.";
}

db.ref("config/wifi").on("value", (snapshot) => {
  const data = snapshot.val() || {};
  document.getElementById("wifiSsid").value = data.ssid || "";
  document.getElementById("wifiPass").value = data.pass || "";
  document.getElementById("wifiStatusText").innerText = data.ssid
    ? "Đã tải cấu hình WiFi."
    : "Chưa có cấu hình WiFi";
});

// ===== RESET FUNCTIONS =====
let lastDeletedData = null;
let lastDeletedTotals = null;
let deletedType = null;
let undoTimer = null;

function resetCounter() {
  db.ref("tong_vao").set(0);
  db.ref("tong_ra").set(0);
  alert("Đã reset counters!");
}

function resetAllData() {
  if (!confirm("Bạn có chắc chắn muốn xóa hết dữ liệu và đưa về 0?")) return;

  db.ref("bird_data")
    .set(null)
    .then(() =>
      Promise.all([db.ref("tong_vao").set(0), db.ref("tong_ra").set(0)]),
    )
    .then(() => {
      alert("Đã xóa hết dữ liệu và đưa về 0.");
      refreshAfterReset();
    })
    .catch((error) => {
      console.error(error);
      alert("Xảy ra lỗi khi xóa dữ liệu.");
    });
}

function saveCurrentTotalsForUndo() {
  return Promise.all([
    db.ref("tong_vao").once("value"),
    db.ref("tong_ra").once("value"),
  ]).then(([vaoSnap, raSnap]) => {
    lastDeletedTotals = {
      tong_vao: vaoSnap.val() || 0,
      tong_ra: raSnap.val() || 0,
    };
  });
}

function showResetPanel() {
  const panel = document.getElementById("resetPanel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

function initDaySelect() {
  const daySel = document.getElementById("resetDayDay");
  const monthSel = document.getElementById("resetDayMonth");
  const yearSel = document.getElementById("resetDayYear");
  if (!daySel || !monthSel || !yearSel) return;

  if (monthSel.options.length === 0) {
    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement("option");
      opt.value = String(m).padStart(2, "0");
      opt.text = String(m).padStart(2, "0");
      monthSel.appendChild(opt);
    }
  }

  if (yearSel.options.length === 0) {
    const currentYear = new Date().getFullYear();
    for (let offset = -3; offset <= 3; offset++) {
      const y = currentYear + offset;
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.text = String(y);
      yearSel.appendChild(opt);
    }
  }

  function populateDays() {
    const y = parseInt(yearSel.value, 10);
    const m = parseInt(monthSel.value, 10);
    const daysInMonth = new Date(y, m, 0).getDate();
    daySel.innerHTML = "";
    for (let d = 1; d <= daysInMonth; d++) {
      const opt = document.createElement("option");
      opt.value = String(d).padStart(2, "0");
      opt.text = String(d).padStart(2, "0");
      daySel.appendChild(opt);
    }
  }

  monthSel.onchange = populateDays;
  yearSel.onchange = populateDays;

  if (!monthSel.value)
    monthSel.value = String(new Date().getMonth() + 1).padStart(2, "0");
  if (!yearSel.value) yearSel.value = String(new Date().getFullYear());
  populateDays();
}

function showDayResetPanel() {
  initDaySelect();
  document.getElementById("dayResetPanel").style.display = "block";
  document.getElementById("monthResetPanel").style.display = "none";
}

function initMonthResetSelect() {
  const yearSelect = document.getElementById("resetMonthYear");
  if (yearSelect.options.length > 0) return;

  const currentYear = new Date().getFullYear();
  for (let offset = -3; offset <= 3; offset++) {
    const year = currentYear + offset;
    const option = document.createElement("option");
    option.value = year.toString();
    option.text = year.toString();
    yearSelect.appendChild(option);
  }
}

function showMonthResetPanel() {
  initMonthResetSelect();
  document.getElementById("monthResetPanel").style.display = "block";
  document.getElementById("dayResetPanel").style.display = "none";
}

function confirmResetDay() {
  const d = document.getElementById("resetDayDay").value;
  const m = document.getElementById("resetDayMonth").value;
  const y = document.getElementById("resetDayYear").value;
  if (!d || !m || !y) {
    alert("Vui lòng chọn ngày/tháng/năm cần reset.");
    return;
  }

  const day = `${y}-${m}-${d}`;

  if (!confirm(`Bạn có chắc chắn muốn reset dữ liệu ngày ${day}?`)) return;

  saveCurrentTotalsForUndo().then(() => {
    db.ref(`bird_data/${day}`)
      .once("value")
      .then((snapshot) => {
        const data = snapshot.val();
        if (!data) {
          alert("Không tìm thấy dữ liệu cho ngày đã chọn.");
          return;
        }

        const deleted = {};
        deleted[day] = data;
        lastDeletedData = deleted;
        deletedType = "day";

        db.ref(`bird_data/${day}`)
          .remove()
          .then(() => {
            db.ref("tong_vao").set(0);
            db.ref("tong_ra").set(0);
            showUndoMessage(day, 1, "day");
            refreshAfterReset();
          });
      });
  });
}

function confirmResetMonth() {
  const month = document.getElementById("resetMonthMonth").value;
  const year = document.getElementById("resetMonthYear").value;
  if (!month || !year) {
    alert("Vui lòng chọn tháng và năm cần reset.");
    return;
  }

  const monthInput = `${year}-${month}`;
  const monthPrefix = `${year}-${month}-`;

  if (!confirm(`Bạn có chắc chắn muốn reset dữ liệu tháng ${month}/${year}?`)) {
    return;
  }

  saveCurrentTotalsForUndo().then(() => {
    db.ref("bird_data")
      .once("value")
      .then((snapshot) => {
        const data = snapshot.val() || {};
        const deleted = {};
        const updates = {};
        let deletedCount = 0;

        for (let date in data) {
          if (date.startsWith(monthPrefix)) {
            deleted[date] = data[date];
            updates[`bird_data/${date}`] = null;
            deletedCount++;
          }
        }

        if (deletedCount === 0) {
          alert("Không tìm thấy dữ liệu cho tháng đã chọn.");
          return;
        }

        db.ref()
          .update(updates)
          .then(() => {
            lastDeletedData = deleted;
            deletedType = "month";
            db.ref("tong_vao").set(0);
            db.ref("tong_ra").set(0);
            showUndoMessage(monthInput, deletedCount, "month");
            refreshAfterReset();
          });
      });
  });
}

function showUndoMessage(idText, deletedCount, type) {
  const messageEl = document.getElementById("resetMessageText");
  const countdownEl = document.getElementById("undoCountdown");
  const undoBox = document.getElementById("resetMessage");

  if (type === "day") {
    messageEl.innerText = `Đã xóa dữ liệu ngày ${idText}.`;
  } else {
    const [year, month] = idText.split("-");
    messageEl.innerText = `Đã xóa ${deletedCount} ngày của tháng ${month}/${year}.`;
  }

  countdownEl.innerText = "10";
  undoBox.style.display = "block";

  if (undoTimer) clearInterval(undoTimer);

  let seconds = 10;
  undoTimer = setInterval(() => {
    seconds -= 1;
    countdownEl.innerText = seconds;
    if (seconds <= 0) {
      clearInterval(undoTimer);
      undoTimer = null;
      lastDeletedData = null;
      deletedType = null;
      hideResetMessage();
    }
  }, 1000);
}

function hideResetMessage() {
  const undoBox = document.getElementById("resetMessage");
  if (undoBox) undoBox.style.display = "none";
}

function undoReset() {
  if (!lastDeletedData) return;

  const restorePromises = [];
  for (let date in lastDeletedData) {
    restorePromises.push(
      db.ref(`bird_data/${date}`).set(lastDeletedData[date]),
    );
  }

  if (lastDeletedTotals) {
    restorePromises.push(db.ref("tong_vao").set(lastDeletedTotals.tong_vao));
    restorePromises.push(db.ref("tong_ra").set(lastDeletedTotals.tong_ra));
  }

  Promise.all(restorePromises).then(() => {
    alert("Đã khôi phục dữ liệu.");
    lastDeletedData = null;
    lastDeletedTotals = null;
    deletedType = null;
    if (undoTimer) {
      clearInterval(undoTimer);
      undoTimer = null;
    }
    hideResetMessage();
    refreshAfterReset();
  });
}

function refreshAfterReset() {
  if (typeof loadMonthChart === "function") loadMonthChart();
  if (typeof loadChart === "function") loadChart();
  const fromDate = document.getElementById("fromDate")?.value;
  const toDate = document.getElementById("toDate")?.value;
  if (fromDate && toDate) loadStats();
}

// ===== SYSTEM CONTROL =====
function toggleSystem(state) {
  db.ref("config/enabled").set(state);
}

db.ref("status").on("value", (snapshot) => {
  const data = snapshot.val() || {};

  document.getElementById("espStatus").className =
    "status " + (data.esp ? "online" : "offline");

  document.getElementById("espStatus").innerText = data.esp
    ? "Online"
    : "Offline";

  document.getElementById("radarStatus").className =
    "status " + (data.radar ? "online" : "offline");

  document.getElementById("radarStatus").innerText = data.radar
    ? "Online"
    : "Offline";
});

// ===== WIFI CONFIG =====
function openWifiConfig() {
  const frameBox = document.getElementById("wifiFrameBox");
  const frame = document.getElementById("wifiFrame");

  frameBox.style.display = "block";
  frame.src = "http://192.168.4.1";
}

// ===== SERVICE WORKER =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

function resetESP() {
  if (confirm("Bạn có chắc muốn reset ESP32?")) {
    const resetRef = db.ref("command/reset_esp");
    resetRef.set(true);

    setTimeout(() => {
      resetRef.set(false);
    }, 5000);
  }
}
