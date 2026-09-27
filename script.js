import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";

// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

// DOM Elements
const canvas = document.getElementById("pdfCanvas");
const context = canvas.getContext("2d");
const previousButton = document.getElementById("previous");
const nextButton = document.getElementById("next");
const previousArea = document.getElementById("previousArea");
const nextArea = document.getElementById("nextArea");
const pageNumber = document.getElementById("pageNumber");
const navigation = document.getElementById("navigation");
const loading = document.getElementById("loading");
const emailButton = document.getElementById("emailButton");

// Configuration
const email = "shan.gallego04@gmail.com";

// Application State
let pdf = null;
let currentPage = 1;
let rendering = false;
let pendingPage = null;
let navigationTimer;
let resizeTimer;
let touchStartX = 0;

// Load Portfolio PDF
const loadingTask = pdfjsLib.getDocument("Portfolio.pdf");

loadingTask.promise
  .then(async (loadedPdf) => {
    pdf = loadedPdf;
    await renderPage(currentPage);
    loading.classList.add("hidden");
  })
  .catch((error) => {
    loading.textContent = "Unable to load Portfolio.pdf";
    console.error(error);
  });

/**
 * Render a specific page on the canvas
 */
async function renderPage(pageNumberToRender) {
  if (rendering) {
    pendingPage = pageNumberToRender;
    return;
  }

  rendering = true;

  const page = await pdf.getPage(pageNumberToRender);
  const slide = document.querySelector(".slide");

  const originalViewport = page.getViewport({ scale: 1 });
  const slideWidth = slide.clientWidth;
  const slideHeight = slide.clientHeight;

  const scale = Math.min(
    slideWidth / originalViewport.width,
    slideHeight / originalViewport.height
  );

  const viewport = page.getViewport({ scale });
  const devicePixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(viewport.width * devicePixelRatio);
  canvas.height = Math.floor(viewport.height * devicePixelRatio);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  updateNavigation();
  rendering = false;

  if (pendingPage !== null) {
    const nextPageToRender = pendingPage;
    pendingPage = null;
    renderPage(nextPageToRender);
  }
}

/**
 * Update page UI counters and button states
 */
function updateNavigation() {
  pageNumber.textContent = `${String(currentPage).padStart(2, "0")} / ${String(pdf.numPages).padStart(2, "0")}`;
  previousButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === pdf.numPages;
}

/**
 * Go to the next page
 */
function nextPage() {
  if (!pdf) return;

  if (currentPage < pdf.numPages) {
    currentPage++;
    renderPage(currentPage);
  }

  showNavigation();
}

/**
 * Go to the previous page
 */
function previousPage() {
  if (!pdf) return;

  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
  }

  showNavigation();
}

/**
 * Temporarily show navigation overlay controls
 */
function showNavigation() {
  navigation.classList.add("visible");
  clearTimeout(navigationTimer);

  navigationTimer = setTimeout(() => {
    navigation.classList.remove("visible");
  }, 1200);
}

// Event Listeners - Button Controls
previousButton.addEventListener("click", previousPage);
nextButton.addEventListener("click", nextPage);

// Event Listeners - Click Area Controls
previousArea.addEventListener("click", previousPage);
nextArea.addEventListener("click", nextPage);

// Event Listeners - Email Clipboard Copy
emailButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(email);
    const originalText = emailButton.textContent;
    emailButton.textContent = "Copied";

    setTimeout(() => {
      emailButton.textContent = originalText;
    }, 1200);
  } catch (error) {
    window.location.href = `mailto:${email}`;
  }
});

// Event Listeners - Keyboard Navigation
document.addEventListener("keydown", (event) => {
  if (
    event.key === "ArrowRight" ||
    event.key === "PageDown" ||
    event.key === " "
  ) {
    event.preventDefault();
    nextPage();
  }

  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    previousPage();
  }

  if (event.key === "Home") {
    event.preventDefault();
    currentPage = 1;
    renderPage(currentPage);
  }

  if (event.key === "End") {
    event.preventDefault();
    currentPage = pdf.numPages;
    renderPage(currentPage);
  }
});

// Event Listeners - Touch / Swipe Navigation
document.addEventListener(
  "touchstart",
  (event) => {
    touchStartX = event.changedTouches[0].screenX;
  },
  { passive: true }
);

document.addEventListener(
  "touchend",
  (event) => {
    const touchEndX = event.changedTouches[0].screenX;
    const distance = touchEndX - touchStartX;

    if (Math.abs(distance) > 50) {
      if (distance < 0) {
        nextPage();
      } else {
        previousPage();
      }
    }
  },
  { passive: true }
);

// Event Listeners - Debounced Window Resize
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    if (pdf) {
      renderPage(currentPage);
    }
  }, 150);
});