// Save Webpage Popup Logic
document.addEventListener("DOMContentLoaded", async () => {
  const loadingContainer = document.getElementById("loadingContainer");
  const contentContainer = document.getElementById("contentContainer");
  const saveBtn = document.getElementById("saveBtn");

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const pageUrl = urlParams.get("pageUrl");
  const textParam = urlParams.get("text");
  const imageUrlParam = urlParams.get("imageUrl");
  const pdfUrlParam = urlParams.get("pdfUrl");

  if (!pageUrl && !pdfUrlParam) {
    showErrorMessage("No page URL or PDF URL provided");
    return;
  }

  const decodedPageUrl = decodeURIComponent(pageUrl || "");
  const decodedText = textParam ? decodeURIComponent(textParam) : null;
  const decodedImageUrl = imageUrlParam
    ? decodeURIComponent(imageUrlParam)
    : null;
  const decodedPdfUrl = pdfUrlParam ? decodeURIComponent(pdfUrlParam) : null;

  console.log(
    "Save webpage popup - checking URL:",
    decodedPageUrl || decodedPdfUrl
  );
  console.log("Selected text:", decodedText);
  console.log("Image URL:", decodedImageUrl);
  console.log("PDF URL:", decodedPdfUrl);

  try {
    // For PDFs, we don't need to check if webpage exists since PDFs are always treated as new
    if (decodedPdfUrl) {
      // Hide loading spinner
      if (loadingContainer) {
        loadingContainer.style.display = "none";
      }

      // Show editable view for PDF
      console.log("Showing editable view for PDF");
      showEditableView(
        decodedPdfUrl,
        decodedText || undefined,
        decodedImageUrl || undefined,
        true // isPdf flag
      );
    } else {
      // Check if webpage already exists
      if (typeof (window as any).checkWebpageExists === "function") {
        console.log("Checking webpage existence...");
        const result = await (window as any).checkWebpageExists(decodedPageUrl);
        console.log("Webpage existence check result:", result);

        // Hide loading spinner
        if (loadingContainer) {
          loadingContainer.style.display = "none";
        }

        if (result && result.exists) {
          // Webpage already exists - show read-only view
          console.log("Webpage already exists, showing read-only view");
          showAlreadySavedView(
            decodedPageUrl,
            result.webpage,
            decodedText || undefined,
            decodedImageUrl || undefined
          );
        } else {
          // Webpage doesn't exist - show editable view
          console.log("Webpage doesn't exist, showing editable view");
          showEditableView(
            decodedPageUrl,
            decodedText || undefined,
            decodedImageUrl || undefined
          );
        }
      } else {
        console.error("checkWebpageExists function not available");
        showErrorMessage("Unable to check webpage existence");
      }
    }
  } catch (error) {
    console.error("Error checking webpage existence:", error);
    showErrorMessage("Failed to check webpage existence");
  }
});

function showAlreadySavedView(
  pageUrl: string,
  webpage: any,
  selectedText?: string,
  imageUrl?: string
) {
  const contentContainer = document.getElementById("contentContainer");
  const saveBtn = document.getElementById("saveBtn");

  if (!contentContainer) return;

  // Create selected text display if available
  const selectedTextHtml = selectedText
    ? `
      <div class="divider">
        <div class="divider-line"></div>
        <span class="divider-text">Content to annotate</span>
      </div>
      <div class="form-group">
        <label>Text Title (Optional)</label>
        <input type="text" id="textTitle" placeholder="Enter a title for this text selection..." style="width: 100%; font-size: 13px; padding: 5px 7px; border-radius: 4px; border: 1px solid #d0d0d0; background: #fff; box-sizing: border-box;">
      </div>
      <div class="form-group">
        <label>Selected Text</label>
        <div class="selected-text">${selectedText}</div>
      </div>
    `
    : "";

  // Create image display if available
  const imageHtml = imageUrl
    ? `
      <div class="divider">
        <div class="divider-line"></div>
        <span class="divider-text">Content to annotate</span>
      </div>
      <div class="form-group">
        <label>Image Title (Optional)</label>
        <input type="text" id="imageTitle" placeholder="Enter a title for this image..." style="width: 100%; font-size: 13px; padding: 5px 7px; border-radius: 4px; border: 1px solid #d0d0d0; background: #fff; box-sizing: border-box;">
      </div>
      <div class="form-group">
        <label>Image</label>
        <div class="image-container">
          <img src="${imageUrl}" alt="Selected image" class="annotation-image">
        </div>
      </div>
    `
    : "";

  contentContainer.innerHTML = `
      <div class="info-message">
        This webpage has already been saved to your database.
      </div>
      <div class="form-group">
        <label class="readonly-label">Page URL</label>
        <input type="text" value="${pageUrl}" readonly>
      </div>
      <div class="form-group">
        <label class="readonly-label">Webpage Title</label>
        <input type="text" value="${
          webpage?.title || document.title || "No title"
        }" readonly>
      </div>
      ${selectedTextHtml}
      ${imageHtml}
      
      <div class="divider">
        <div class="divider-line"></div>
        <span class="divider-text">Optional: create annotation</span>
      </div>
    
    <div class="form-group">
      <label for="primaryComment">Annotation</label>
      <textarea id="primaryComment" placeholder="Write your annotation..."></textarea>
    </div>
    
    <div class="secondary-section">
      <button id="toggleSecondary" class="secondary-toggle" type="button">
        + Add secondary comment
      </button>
      <div id="secondaryContainer" class="secondary-comment-collapsed">
        <label for="secondaryComment">Secondary Comment</label>
        <textarea id="secondaryComment" placeholder="Add more details..."></textarea>
      </div>
    </div>
    
    <div class="form-group">
      <label for="tagsInput">
        Tags
        <span style="font-weight: normal; color: #888; font-size: 11px">(comma or Enter to separate)</span>
      </label>
      <div id="tagsInputContainer" class="tags-input-container">
        <input
          id="tagsInput"
          type="text"
          placeholder="e.g. machine learning"
          style="border: none; outline: none; font-size: 13px; min-width: 60px; background: transparent;"
          autocomplete="off"
        />
      </div>
    </div>
  `;

  contentContainer.style.display = "block";

  if (saveBtn) {
    saveBtn.textContent = "Save Annotation";
    saveBtn.style.display = "block";
    saveBtn.onclick = async () => {
      await saveAnnotationOnly(pageUrl);
    };
  }

  // Initialize secondary comment toggle
  const toggleSecondary = document.getElementById(
    "toggleSecondary"
  ) as HTMLButtonElement;
  const secondaryContainer = document.getElementById("secondaryContainer");

  if (toggleSecondary && secondaryContainer) {
    toggleSecondary.onclick = () => {
      const isCollapsed = secondaryContainer.classList.contains(
        "secondary-comment-collapsed"
      );
      if (isCollapsed) {
        secondaryContainer.classList.remove("secondary-comment-collapsed");
        secondaryContainer.classList.add("secondary-comment-expanded");
        toggleSecondary.textContent = "- Remove secondary comment";
      } else {
        secondaryContainer.classList.remove("secondary-comment-expanded");
        secondaryContainer.classList.add("secondary-comment-collapsed");
        toggleSecondary.textContent = "+ Add secondary comment";
      }
    };
  }

  // Initialize tags functionality
  initializeTags();
}

function showEditableView(
  pageUrl: string,
  selectedText?: string,
  imageUrl?: string,
  isPdf: boolean = false
) {
  const contentContainer = document.getElementById("contentContainer");
  const saveBtn = document.getElementById("saveBtn");

  if (!contentContainer) return;

  // Create selected text display if available
  const selectedTextHtml = selectedText
    ? `
      <div class="divider">
        <div class="divider-line"></div>
        <span class="divider-text">Content to annotate</span>
      </div>
      <div class="form-group">
        <label>Text Title (Optional)</label>
        <input type="text" id="textTitle" placeholder="Enter a title for this text selection..." style="width: 100%; font-size: 13px; padding: 5px 7px; border-radius: 4px; border: 1px solid #d0d0d0; background: #fff; box-sizing: border-box;">
      </div>
      <div class="form-group">
        <label>Selected Text</label>
        <div class="selected-text">${selectedText}</div>
      </div>
    `
    : "";

  // Create image display if available
  const imageHtml = imageUrl
    ? `
      <div class="divider">
        <div class="divider-line"></div>
        <span class="divider-text">Content to annotate</span>
      </div>
      <div class="form-group">
        <label>Image Title (Optional)</label>
        <input type="text" id="imageTitle" placeholder="Enter a title for this image..." style="width: 100%; font-size: 13px; padding: 5px 7px; border-radius: 4px; border: 1px solid #d0d0d0; background: #fff; box-sizing: border-box;">
      </div>
      <div class="form-group">
        <label>Image</label>
        <div class="image-container">
          <img src="${imageUrl}" alt="Selected image" class="annotation-image">
        </div>
      </div>
    `
    : "";

  const urlLabel = isPdf ? "PDF URL" : "Page URL";
  const titleLabel = isPdf ? "PDF Title" : "Webpage Title";
  const titlePlaceholder = isPdf ? "Enter PDF title" : "Enter webpage title";

  contentContainer.innerHTML = `
    <div class="form-group">
      <label>${urlLabel}</label>
      <input type="text" id="pageUrl" value="${pageUrl}" readonly>
    </div>
    <div class="form-group">
      <label>${titleLabel}</label>
      <input type="text" id="webpageTitle" value="${
        document.title || "No title"
      }" placeholder="${titlePlaceholder}">
    </div>
    ${selectedTextHtml}
    ${imageHtml}
    
    <div class="divider">
      <div class="divider-line"></div>
      <span class="divider-text">Optional: create annotation</span>
    </div>
    
    <div class="form-group">
      <label for="primaryComment">Annotation</label>
      <textarea id="primaryComment" placeholder="Write your annotation..."></textarea>
    </div>
    
    <div class="secondary-section">
      <button id="toggleSecondary" class="secondary-toggle" type="button">
        + Add secondary comment
      </button>
      <div id="secondaryContainer" class="secondary-comment-collapsed">
        <label for="secondaryComment">Secondary Comment</label>
        <textarea id="secondaryComment" placeholder="Add more details..."></textarea>
      </div>
    </div>
    
    <div class="form-group">
      <label for="tagsInput">
        Tags
        <span style="font-weight: normal; color: #888; font-size: 11px">(comma or Enter to separate)</span>
      </label>
      <div id="tagsInputContainer" class="tags-input-container">
        <input
          id="tagsInput"
          placeholder="e.g. machine learning"
          style="border: none; outline: none; font-size: 13px; min-width: 60px; background: transparent;"
          autocomplete="off"
        />
      </div>
    </div>
  `;

  contentContainer.style.display = "block";

  if (saveBtn) {
    const saveText = isPdf ? "Save PDF" : "Save Webpage";
    saveBtn.textContent = saveText;
    saveBtn.style.display = "block";
    saveBtn.onclick = async () => {
      if (isPdf) {
        await savePdfToDatabase(pageUrl);
      } else {
        await saveWebpageToDatabase(pageUrl);
      }
    };
  }

  // Initialize secondary comment toggle
  const toggleSecondary = document.getElementById(
    "toggleSecondary"
  ) as HTMLButtonElement;
  const secondaryContainer = document.getElementById("secondaryContainer");

  if (toggleSecondary && secondaryContainer) {
    toggleSecondary.onclick = () => {
      const isCollapsed = secondaryContainer.classList.contains(
        "secondary-comment-collapsed"
      );
      if (isCollapsed) {
        secondaryContainer.classList.remove("secondary-comment-collapsed");
        secondaryContainer.classList.add("secondary-comment-expanded");
        toggleSecondary.textContent = "- Remove secondary comment";
      } else {
        secondaryContainer.classList.remove("secondary-comment-expanded");
        secondaryContainer.classList.add("secondary-comment-collapsed");
        toggleSecondary.textContent = "+ Add secondary comment";
      }
    };
  }

  // Initialize tags functionality
  initializeTags();
}

async function saveWebpageToDatabase(pageUrl: string) {
  const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;
  const webpageTitleInput = document.getElementById(
    "webpageTitle"
  ) as HTMLInputElement;

  if (!saveBtn || !webpageTitleInput) return;

  const title = webpageTitleInput.value.trim() || document.title || "No title";

  // Get annotation data
  const primaryComment =
    (document.getElementById("primaryComment") as HTMLTextAreaElement)?.value ||
    "";
  const secondaryComment =
    (document.getElementById("secondaryComment") as HTMLTextAreaElement)
      ?.value || "";

  // Get selected text if available
  const selectedTextElement = document.querySelector(
    ".selected-text"
  ) as HTMLElement;
  const selectedText = selectedTextElement?.textContent || "";

  // Get text title if available
  const textTitleElement = document.getElementById(
    "textTitle"
  ) as HTMLInputElement;
  const textTitle = textTitleElement?.value || "";

  // Get image URL if available
  const imageElement = document.querySelector(
    ".annotation-image"
  ) as HTMLImageElement;
  const imageUrl = imageElement?.src || "";

  // Get image title if available
  const imageTitleElement = document.getElementById(
    "imageTitle"
  ) as HTMLInputElement;
  const imageTitle = imageTitleElement?.value || "";

  // Use the global tags array directly

  // Disable save button and show loading
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    console.log("Saving webpage:", {
      url: pageUrl,
      title,
      selectedText,
      textTitle,
      imageUrl,
      imageTitle,
    });

    // Get HTML content from the original page
    const htmlContent = await getPageHTML(pageUrl);

    // Request screenshot from background script
    let screenshotUrl = "";
    try {
      const screenshotResponse = await chrome.runtime.sendMessage({
        type: "capture_screenshot",
        pageUrl: pageUrl,
      });

      if (screenshotResponse && screenshotResponse.success) {
        screenshotUrl = screenshotResponse.screenshot;
        console.log("Screenshot captured successfully");
      } else {
        console.warn(
          "Failed to capture screenshot:",
          screenshotResponse?.error
        );
      }
    } catch (error) {
      console.warn("Error capturing screenshot:", error);
    }

    // Save webpage
    await (window as any).saveWebpage({
      url: pageUrl,
      title: title,
      html_content: htmlContent,
      screenshot_url: screenshotUrl,
      metadata: {
        comment: primaryComment,
        secondaryComment: secondaryComment,
        tags: tags,
      },
    });

    console.log("Webpage saved successfully");

    // Save annotation if we have comments/tags, selected text, or image
    if (
      primaryComment ||
      secondaryComment ||
      tags.length > 0 ||
      selectedText ||
      imageUrl
    ) {
      console.log(
        "Saving annotation with comments, tags, selected text, and image"
      );
      try {
        await (window as any).saveAnnotation({
          pageUrl: pageUrl,
          comment: primaryComment,
          secondaryComment: secondaryComment,
          tags: tags,
          selectedText: selectedText,
          textTitle: textTitle,
          imageUrl: imageUrl,
          imageTitle: imageTitle,
        });
        console.log("Annotation saved successfully");
      } catch (annotationError) {
        console.error("Failed to save annotation:", annotationError);
        // Don't fail the whole save if annotation fails
      }
    }

    // Show success alert and auto-close
    const hasAnnotation = primaryComment || secondaryComment || tags.length > 0;
    const message = hasAnnotation
      ? "Webpage and annotation saved successfully!"
      : "Webpage saved successfully!";
    alert(message);
    window.close();
  } catch (error) {
    console.error("Failed to save webpage:", error);
    alert("Failed to save webpage: " + ((error as any).message || error));

    // Re-enable save button
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Webpage";
  }
}

async function savePdfToDatabase(pdfUrl: string) {
  const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;
  const pdfTitleInput = document.getElementById(
    "webpageTitle"
  ) as HTMLInputElement;

  if (!saveBtn || !pdfTitleInput) return;

  const title = pdfTitleInput.value.trim() || document.title || "No title";

  // Get annotation data
  const primaryComment =
    (document.getElementById("primaryComment") as HTMLTextAreaElement)?.value ||
    "";
  const secondaryComment =
    (document.getElementById("secondaryComment") as HTMLTextAreaElement)
      ?.value || "";

  // Get selected text if available
  const selectedTextElement = document.querySelector(
    ".selected-text"
  ) as HTMLElement;
  const selectedText = selectedTextElement?.textContent || "";

  // Get text title if available
  const textTitleElement = document.getElementById(
    "textTitle"
  ) as HTMLInputElement;
  const textTitle = textTitleElement?.value || "";

  // Get image URL if available
  const imageElement = document.querySelector(
    ".annotation-image"
  ) as HTMLImageElement;
  const imageUrl = imageElement?.src || "";

  // Get image title if available
  const imageTitleElement = document.getElementById(
    "imageTitle"
  ) as HTMLInputElement;
  const imageTitle = imageTitleElement?.value || "";

  // Use the global tags array directly

  // Disable save button and show loading
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    console.log("Saving PDF:", {
      url: pdfUrl,
      title,
      selectedText,
      textTitle,
      imageUrl,
      imageTitle,
    });

    // Request screenshot from background script
    let screenshotUrl = "";
    try {
      const screenshotResponse = await chrome.runtime.sendMessage({
        type: "capture_screenshot",
        pageUrl: pdfUrl,
      });

      if (screenshotResponse && screenshotResponse.success) {
        screenshotUrl = screenshotResponse.screenshot;
        console.log("Screenshot captured successfully");
      } else {
        console.warn(
          "Failed to capture screenshot:",
          screenshotResponse?.error
        );
      }
    } catch (error) {
      console.warn("Error capturing screenshot:", error);
    }

    // Save PDF using the same saveWebpage function but with PDF metadata
    await (window as any).saveWebpage({
      url: pdfUrl,
      title: title,
      html_content: undefined, // PDFs don't have HTML content
      screenshot_url: screenshotUrl,
      metadata: {
        comment: primaryComment,
        secondaryComment: secondaryComment,
        tags: tags,
        type: "pdf", // Mark as PDF type
      },
    });

    console.log("PDF saved successfully");

    // Save annotation if we have comments/tags, selected text, or image
    if (
      primaryComment ||
      secondaryComment ||
      tags.length > 0 ||
      selectedText ||
      imageUrl
    ) {
      console.log(
        "Saving annotation with comments, tags, selected text, and image"
      );
      try {
        await (window as any).saveAnnotation({
          pageUrl: pdfUrl,
          comment: primaryComment,
          secondaryComment: secondaryComment,
          tags: tags,
          selectedText: selectedText,
          textTitle: textTitle,
          imageUrl: imageUrl,
          imageTitle: imageTitle,
        });
        console.log("Annotation saved successfully");
      } catch (annotationError) {
        console.error("Failed to save annotation:", annotationError);
        // Don't fail the whole save if annotation fails
      }
    }

    // Show success alert and auto-close
    const hasAnnotation = primaryComment || secondaryComment || tags.length > 0;
    const message = hasAnnotation
      ? "PDF and annotation saved successfully!"
      : "PDF saved successfully!";
    alert(message);
    window.close();
  } catch (error) {
    console.error("Failed to save PDF:", error);
    alert("Failed to save PDF: " + ((error as any).message || error));

    // Re-enable save button
    saveBtn.disabled = false;
    saveBtn.textContent = "Save PDF";
  }
}

async function getPageHTML(pageUrl: string): Promise<string> {
  try {
    // Try to get HTML content from the original page
    const response = await fetch(pageUrl);
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    console.warn("Could not fetch page HTML:", error);
  }

  // Fallback to basic HTML
  return `<html><head><title>${document.title}</title></head><body><p>Content from ${pageUrl}</p></body></html>`;
}

// Tags functionality
let tags: string[] = [];

function initializeTags() {
  const tagsInput = document.getElementById("tagsInput") as HTMLInputElement;
  const tagsContainer = document.getElementById("tagsInputContainer");

  if (!tagsInput || !tagsContainer) return;

  tagsInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTagFromInput();
    }
  });

  tagsInput.addEventListener("blur", () => {
    if (tagsInput.value.trim()) {
      addTagFromInput();
    }
  });
}

function addTagFromInput() {
  const tagsInput = document.getElementById("tagsInput") as HTMLInputElement;
  const tagsContainer = document.getElementById("tagsInputContainer");

  if (!tagsInput || !tagsContainer) return;

  const tag = tagsInput.value.trim();
  if (tag && !tags.includes(tag)) {
    tags.push(tag);
    renderTags();
  }
  tagsInput.value = "";
}

function removeTag(tagToRemove: string) {
  tags = tags.filter((tag) => tag !== tagToRemove);
  renderTags();
}

function renderTags() {
  const tagsContainer = document.getElementById("tagsInputContainer");
  const tagsInput = document.getElementById("tagsInput") as HTMLInputElement;

  if (!tagsContainer || !tagsInput) return;

  // Clear existing chips
  const existingChips = tagsContainer.querySelectorAll(".tag-chip");
  existingChips.forEach((chip) => chip.remove());

  // Add tag chips
  tags.forEach((tag) => {
    const chip = document.createElement("div");
    chip.className = "tag-chip";
    chip.innerHTML = `
      ${tag}
      <span class="remove-tag" onclick="removeTag('${tag}')">&times;</span>
    `;
    tagsContainer.insertBefore(chip, tagsInput);
  });
}

function parseTags(tagsString: string): string[] {
  return tagsString
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

// Expose removeTag globally for onclick handlers
(window as any).removeTag = removeTag;

async function saveAnnotationOnly(pageUrl: string) {
  const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;

  if (!saveBtn) return;

  // Get annotation data
  const primaryComment =
    (document.getElementById("primaryComment") as HTMLTextAreaElement)?.value ||
    "";
  const secondaryComment =
    (document.getElementById("secondaryComment") as HTMLTextAreaElement)
      ?.value || "";

  // Get selected text if available
  const selectedTextElement = document.querySelector(
    ".selected-text"
  ) as HTMLElement;
  const selectedText = selectedTextElement?.textContent || "";

  // Get text title if available
  const textTitleElement = document.getElementById(
    "textTitle"
  ) as HTMLInputElement;
  const textTitle = textTitleElement?.value || "";

  // Get image URL if available
  const imageElement = document.querySelector(
    ".annotation-image"
  ) as HTMLImageElement;
  const imageUrl = imageElement?.src || "";

  // Get image title if available
  const imageTitleElement = document.getElementById(
    "imageTitle"
  ) as HTMLInputElement;
  const imageTitle = imageTitleElement?.value || "";

  // Use the global tags array directly

  // Check if we have any annotation content
  if (
    !primaryComment &&
    !secondaryComment &&
    tags.length === 0 &&
    !selectedText &&
    !imageUrl
  ) {
    alert(
      "Please add an annotation, comment, tags, select text, or include an image before saving."
    );
    return;
  }

  // Disable save button and show loading
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    console.log("Saving annotation only:", {
      pageUrl,
      primaryComment,
      secondaryComment,
      tags,
    });

    await (window as any).saveAnnotation({
      pageUrl: pageUrl,
      comment: primaryComment,
      secondaryComment: secondaryComment,
      tags: tags,
      selectedText: selectedText,
      textTitle: textTitle,
      imageUrl: imageUrl,
      imageTitle: imageTitle,
    });

    console.log("Annotation saved successfully");

    // Show success alert and auto-close
    alert("Annotation saved successfully!");
    window.close();
  } catch (error) {
    console.error("Failed to save annotation:", error);
    alert("Failed to save annotation: " + ((error as any).message || error));

    // Re-enable save button
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Annotation";
  }
}

function showErrorMessage(message: string) {
  const loadingContainer = document.getElementById("loadingContainer");
  const contentContainer = document.getElementById("contentContainer");

  if (loadingContainer) {
    loadingContainer.style.display = "none";
  }

  if (contentContainer) {
    contentContainer.innerHTML = `
      <div class="info-message" style="color: #f44336;">
        Error: ${message}
      </div>
    `;
    contentContainer.style.display = "block";
  }

  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.textContent = "Close";
    saveBtn.style.display = "block";
    saveBtn.onclick = () => window.close();
  }
}
