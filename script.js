// Firebase Configuration
const firebaseConfig = {
  databaseURL:
    "https://radar-swiftlet-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===== DISPLAY VALUES =====
// updateDailySummary: cập nhật số liệu tổng chim vào,ra và hiệu số trên giao diện dashboard.
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
// showPage: chuyển đổi giữa các trang màn hình trong ứng dụng, đồng thời khởi tạo lịch chọn ngày cho trang thống kê khi cần.
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

// drawChart: tạo hoặc cập nhật biểu đồ đường hàng giờ cho dữ liệu chim vào và chim ra
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

let monthChart;
// drawMonthChart: tạo hoặc cập nhật biểu đồ cột tháng cho tổng 'chim vào', 'chim ra' và 'tổng' theo tháng.
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
// getVNNow: trả về đối tượng Date hiện tại theo múi giờ Asia/Ho_Chi_Minh (giờ Việt Nam), tránh sai lệch khi truy cập từ server hoặc trình duyệt khác múi giờ.
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

// getVNDate: trả về ngày hiện tại ở định dạng YYYY-MM-DD theo giờ Việt Nam.
function getVNDate() {
  const now = getVNNow();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// loadChart: lắng nghe dữ liệu ngày hiện tại từ Firebase Realtime Database và vẽ biểu đồ hàng giờ kèm số liệu tổng.
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
// loadMonthChart: lắng nghe toàn bộ dữ liệu bird_data và xây dựng biểu đồ tổng theo tháng.
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
// formatDateVN: chuyển đổi định dạng ngày từ YYYY-MM-DD sang DD/MM/YYYY để hiển thị cho người dùng.
function formatDateVN(dateStr) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

// initStatsDateSelects: khởi tạo các menu chọn ngày/tháng/năm cho bảng thống kê, với giá trị mặc định là ngày hiện tại.
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

// toggleStatsDatePanel: hiển thị hoặc ẩn panel chọn ngày thống kê khi người dùng muốn lọc dữ liệu.
function toggleStatsDatePanel() {
  const panel = document.getElementById("statsDatePanel");
  if (!panel) return;
  initStatsDateSelects();
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

// getStatsDate: đọc giá trị ngày/tháng/năm từ các select element và trả về chuỗi YYYY-MM-DD.
function getStatsDate(prefix) {
  const day = document.getElementById(`${prefix}Day`).value;
  const month = document.getElementById(`${prefix}Month`).value;
  const year = document.getElementById(`${prefix}Year`).value;
  return day && month && year ? `${year}-${month}-${day}` : "";
}
// tải dữ liệu thống kê theo ngày đã chọn trong panel thống kê
// loadStats: tải dữ liệu từ Firebase trong khoảng ngày đã chọn và hiển thị bảng thống kê theo ngày/giờ đã sắp xếp.
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

      // Collect dates in range and sort them ascending
      const dates = Object.keys(data)
        .filter((d) => d >= fromDate && d <= toDate)
        .sort();

      for (let date of dates) {
        const hoursObj = data[date] || {};

        // Sort hour keys numerically (handle formats like "0", "00", "0:30", "01:00")
        const hourKeys = Object.keys(hoursObj).sort((a, b) => {
          const parseHour = (h) => {
            if (typeof h !== "string") h = String(h);
            if (h.includes(":")) h = h.split(":")[0];
            const n = parseInt(h, 10);
            return isNaN(n) ? 0 : n;
          };
          return parseHour(a) - parseHour(b);
        });

        for (let hour of hourKeys) {
          const entry = hoursObj[hour] || {};
          const vao = entry.vao || 0;
          const ra = entry.ra || 0;
          const netHour = vao - ra;

          let hourLabel = hour;
          if (hourLabel.includes(":")) hourLabel = hourLabel.split(":")[0];
          const hourNum = parseInt(hourLabel, 10);
          const hourDisplay = String(isNaN(hourNum) ? 0 : hourNum).padStart(
            2,
            "0",
          );

          table.innerHTML += `
          <tr>
            <td>${formatDateVN(date)}</td>
            <td>${hourDisplay}:00</td>
            <td>${vao}</td>
            <td>${ra}</td>
            <td>${netHour}</td>
          </tr>
          `;
        }
      }
    });
}
//xuất dữ liệu thống kê ra file excel
// exportToExcel: xuất nội dung bảng HTML hiện tại ra file Excel .xlsx bằng thư viện XLSX.
function exportToExcel() {
  const table = document.querySelector("table");
  const workbook = XLSX.utils.table_to_book(table, {
    sheet: "ThongKeNhaYen",
  });

  XLSX.writeFile(workbook, "ThongKeNhaYen.xlsx");
}

// ===== hỗ trợ =====
// sendEmail: mở trình gửi email mặc định để người dùng gửi yêu cầu hỗ trợ đến địa chỉ kỹ thuật.
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
    "mailto:khangb2204563@student.ctu.edu.vn,duyb2204543@student.ctu.edu.vn?subject=Hỗ trợ hệ thống&body=" +
    encodeURIComponent(body);
}

// ===== CONNECTION & THRESHOLD =====
// updateThresholdValue: cập nhật nhãn hiển thị giá trị ngưỡng khi người dùng kéo slider.
function updateThresholdValue(val) {
  document.getElementById("thresholdValue").innerText = val;
}

// saveThreshold: lưu giá trị ngưỡng radar vào Firebase để ESP32 sử dụng cấu hình.
function saveThreshold() {
  const value = document.getElementById("thresholdSlider").value;
  db.ref("config/threshold").set(parseInt(value));
}

// saveWifiConfig: lưu cấu hình SSID và mật khẩu WiFi vào Firebase để ESP32 có thể kết nối lại.
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

// Lắng nghe config WiFi từ Firebase và cập nhật giao diện nhập SSID/mật khẩu.
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
// saveCurrentTotalsForUndo: lưu giá trị tổng hiện tại để có thể khôi phục khi undo reset dữ liệu.
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

// showResetPanel: bật/tắt panel reset toàn bộ dữ liệu hoặc data theo ngày/tháng.
function showResetPanel() {
  const panel = document.getElementById("resetPanel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

// initDaySelect: khởi tạo các select ngày/tháng/năm cho chức năng reset theo ngày.
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

// showDayResetPanel: hiển thị panel reset theo ngày và ẩn panel reset theo tháng.
function showDayResetPanel() {
  initDaySelect();
  document.getElementById("dayResetPanel").style.display = "block";
  document.getElementById("monthResetPanel").style.display = "none";
}

// chọn ngày tháng năm để xem trong thống kê
// initMonthResetSelect: tạo select năm cho chức năng reset theo tháng.
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

// showMonthResetPanel: hiển thị panel reset theo tháng và ẩn panel reset theo ngày.
function showMonthResetPanel() {
  initMonthResetSelect();
  document.getElementById("monthResetPanel").style.display = "block";
  document.getElementById("dayResetPanel").style.display = "none";
}

// confirmResetDay: xóa dữ liệu một ngày đã chọn và lưu bản sao để undo trong 10 giây.
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

// confirmResetMonth: xóa toàn bộ dữ liệu trong một tháng đã chọn, đồng thời lưu bản sao để undo.
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

// showUndoMessage: hiển thị thông báo reset và đếm ngược 10 giây để người dùng có thể undo.
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

// hideResetMessage: ẩn thông báo undo khi thời gian kết thúc hoặc khi undo thành công.
function hideResetMessage() {
  const undoBox = document.getElementById("resetMessage");
  if (undoBox) undoBox.style.display = "none";
}
// khôi phục dữ liệu đã xóa trong 10 giây sau khi reset
// undoReset: phục hồi lại dữ liệu đã xóa trong 10 giây kể từ khi reset.
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

// refreshAfterReset: làm mới biểu đồ và thống kê sau khi thực hiện reset hoặc undo.
function refreshAfterReset() {
  if (typeof loadMonthChart === "function") loadMonthChart();
  if (typeof loadChart === "function") loadChart();
  const fromDate = document.getElementById("fromDate")?.value;
  const toDate = document.getElementById("toDate")?.value;
  if (fromDate && toDate) loadStats();
}

// ===== SYSTEM CONTROL =====
// toggleSystem: bật/tắt hệ thống ESP32 bằng cách ghi cấu hình enabled vào Firebase.
function toggleSystem(state) {
  db.ref("config/enabled").set(state);
}
// trạng thái on/off của esp32 và radar
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
// openWifiConfig: mở iframe tới giao diện cấu hình WiFi của ESP32.
function openWifiConfig() {
  const frameBox = document.getElementById("wifiFrameBox");
  const frame = document.getElementById("wifiFrame");

  frameBox.style.display = "block";
  frame.src = "http://192.168.4.1";
}

// ===== SERVICE WORKER =====
// Đăng ký service worker để hỗ trợ caching và offline nếu trình duyệt cho phép.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// resetESP: gửi lệnh reset ESP32 lên Firebase và sau 5 giây xóa lệnh.
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
