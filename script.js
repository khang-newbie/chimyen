// Firebase Configuration
const firebaseConfig = {
  databaseURL:
    "https://radar-swiftlet-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===== DISPLAY VALUES =====
function updateDailySummary(vaoTotal, raTotal) {
  const totals = [vaoTotal, raTotal, vaoTotal - raTotal];
  const bigNumbers = document.querySelectorAll(".big-number");

  if (bigNumbers.length >= 3) {
    bigNumbers[0].innerText = totals[0];
    bigNumbers[1].innerText = totals[1];
    bigNumbers[2].innerText = totals[2];
  }
}

updateDailySummary(0, 0);

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
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
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

let monthChart;
function drawMonthChart(vao, ra, tong) {
  const ctx = document.getElementById("barChart");
  if (monthChart) {
    monthChart.destroy();
  }

  monthChart = new Chart(ctx, {
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
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
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
let currentDate = "";
let currentRef = null;
// đổi sang múi giờ Việt Nam và định dạng ngày tháng năm để lấy dữ liệu theo ngày hiện tại của Việt Nam,
// tránh bị lệch do múi giờ khi chạy trên server nước ngoài
function getVNNow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const values = {};
  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  return new Date(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
}

function getVNDate() {
  const now = getVNNow();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadChart() {
  const today = getVNDate();

  // Nếu vẫn cùng ngày thì không làm gì
  if (today === currentDate && currentRef) return;

  currentDate = today;

  console.log("Listening to:", today);

  // Hủy listener cũ
  if (currentRef) {
    currentRef.off();
  }

  const hours = Array.from(
    { length: 24 },
    (_, i) => String(i).padStart(2, "0") + ":00",
  );

  const vao = new Array(24).fill(0);
  const ra = new Array(24).fill(0);

  currentRef = db.ref("bird_data/" + today);

  currentRef.on("value", (snapshot) => {
    const data = snapshot.val() || {};

    vao.fill(0);
    ra.fill(0);

    for (let hourKey in data) {
      if (!Object.prototype.hasOwnProperty.call(data, hourKey)) continue;

      let h = hourKey;

      if (h.includes(":")) {
        h = h.split(":")[0];
      }

      h = String(parseInt(h, 10)).padStart(2, "0");

      const idx = parseInt(h, 10);

      if (isNaN(idx) || idx < 0 || idx > 23) continue;

      const entry = data[hourKey] || {};

      vao[idx] = entry.vao || 0;
      ra[idx] = entry.ra || 0;
    }

    const totalVao = vao.reduce((sum, value) => sum + value, 0);
    const totalRa = ra.reduce((sum, value) => sum + value, 0);

    updateDailySummary(totalVao, totalRa);

    if (!lineChart) {
      drawChart(hours, vao, ra);
    } else {
      lineChart.data.labels = hours;
      lineChart.data.datasets[0].data = vao;
      lineChart.data.datasets[1].data = ra;

      lineChart.update();
    }
  });
}

// Chạy lần đầu
loadChart();

// Mỗi phút kiểm tra xem có sang ngày mới chưa
setInterval(() => {
  loadChart();
}, 60000);

// ===== LOAD MONTHLY CHART =====
function loadMonthChart() {
  db.ref("bird_data").on("value", (snapshot) => {
    const data = snapshot.val() || {};
    const vaoMonth = new Array(12).fill(0);
    const raMonth = new Array(12).fill(0);
    const tongMonth = new Array(12).fill(0);

    for (let date in data) {
      const month = new Date(date).getMonth();
      const hours = data[date] || {};

      for (let hour in hours) {
        const vao = hours[hour].vao || 0;
        const ra = hours[hour].ra || 0;

        vaoMonth[month] += vao;
        raMonth[month] += ra;
      }
    }

    for (let i = 0; i < 12; i++) {
      tongMonth[i] = vaoMonth[i] - raMonth[i];
    }

    drawMonthChart(vaoMonth, raMonth, tongMonth);
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

  const currentVN = getVNNow();
  const currentYear = currentVN.getFullYear();
  const monthOptions = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  );

  function populateYear(select) {
    if (select.options.length > 0) return;
    for (let year = 2026; year <= 2029; year++) {
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
    fromMonth.value = String(currentVN.getMonth() + 1).padStart(2, "0");
  if (!toYear.value) toYear.value = currentYear;
  if (!toMonth.value)
    toMonth.value = String(currentVN.getMonth() + 1).padStart(2, "0");

  populateDay(fromDay, fromYear.value, fromMonth.value);
  populateDay(toDay, toYear.value, toMonth.value);

  fromYear.onchange = () =>
    populateDay(fromDay, fromYear.value, fromMonth.value);
  fromMonth.onchange = () =>
    populateDay(fromDay, fromYear.value, fromMonth.value);
  toYear.onchange = () => populateDay(toDay, toYear.value, toMonth.value);
  toMonth.onchange = () => populateDay(toDay, toYear.value, toMonth.value);

  if (!fromDay.value)
    fromDay.value = String(currentVN.getDate()).padStart(2, "0");
  if (!toDay.value) toDay.value = String(currentVN.getDate()).padStart(2, "0");
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
// tải dữ liệu thống kê theo ngày đã chọn trong panel thống kê
function loadStats() {
  const fromDate = getStatsDate("from");
  const toDate = getStatsDate("to");

  const table = document.getElementById("statsTable");
  table.innerHTML = "";

  if (!fromDate || !toDate) {
    alert("Vui lòng chọn ngày!");
    return;
  }

  db.ref("bird_data")
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val() || {};

      for (let date in data) {
        if (date >= fromDate && date <= toDate) {
          const hours = data[date] || {};

          for (let hour in hours) {
            const vao = hours[hour].vao || 0;
            const ra = hours[hour].ra || 0;
            const netHour = vao - ra;

            table.innerHTML += `
          <tr>
            <td>${formatDateVN(date)}</td>
            <td>${hour}:00</td>
            <td>${vao}</td>
            <td>${ra}</td>
            <td>${netHour}</td>
          </tr>
          `;
          }
        }
      }
    });
}
//xuất dữ liệu thống kê ra file excel
function exportToExcel() {
  const table = document.querySelector("table");
  const workbook = XLSX.utils.table_to_book(table, {
    sheet: "ThongKeNhaYen",
  });

  XLSX.writeFile(workbook, "ThongKeNhaYen.xlsx");
}

// ===== hỗ trợ =====
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
// ngưỡng và wifi
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
/*
// xóa hết dữ liệu và đưa về 0 tất cả
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
*/
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
    for (let year = 2026; year <= 2029; year++) {
      const opt = document.createElement("option");
      opt.value = String(year);
      opt.text = String(year);
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

// chọn ngày tháng năm để xem trong thống kê
function initMonthResetSelect() {
  const yearSelect = document.getElementById("resetMonthYear");
  if (yearSelect.options.length > 0) return;

  for (let year = 2026; year <= 2029; year++) {
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
//xóa dữ liệu ngày đã chọn nhưng vẫn giữ tổng tháng đó để không ảnh hưởng đến biểu đồ tháng,

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
// khôi phục dữ liệu đã xóa trong 10 giây sau khi reset
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
/*
function toggleSystem(state) {
  db.ref("config/enabled").set(state);
}
  */
// trạng thái on/off của esp32 và radar
db.ref("status").on("value", (snapshot) => {
  const data = snapshot.val() || {};
  const espOnline = data.esp === true || data.esp === "true";
  const radarOnline = data.radar === true || data.radar === "true";

  document.getElementById("espStatus").className =
    "status " + (espOnline ? "online" : "offline");
  document.getElementById("espStatus").innerText = espOnline
    ? "Online"
    : "Offline";

  document.getElementById("radarStatus").className =
    "status " + (radarOnline ? "online" : "offline");
  document.getElementById("radarStatus").innerText = radarOnline
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
function resetAllData() {
  if (confirm("Bạn có chắc muốn reset tất cả dữ liệu?")) {
    const resetRef = db.ref("command/reset_data");
    resetRef.set(true);

    setTimeout(() => {
      resetRef.set(false);
    }, 5000);
  }
}
