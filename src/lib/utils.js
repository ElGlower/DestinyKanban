/**
 * Compresses a base64 image or a File object using canvas.
 * @param {string|File} input - Base64 string or File object.
 * @param {number} maxWidth - Maximum width of the image.
 * @param {number} maxHeight - Maximum height of the image.
 * @param {number} quality - JPEG compression quality (0.0 to 1.0).
 * @returns {Promise<string>} - Resolves with the compressed base64 string.
 */
export function compressImage(input, maxWidth = 1600, maxHeight = 900, quality = 0.6) {
  return new Promise((resolve) => {
    const processBase64 = (base64Str) => {
      // If it's not a data URL or is not an image, just return it
      if (typeof base64Str !== "string" || !base64Str.startsWith("data:image/")) {
        resolve(base64Str);
        return;
      }
      
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Export as compressed JPEG
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    };

    if (typeof window === "undefined") {
      resolve("");
      return;
    }

    if (input instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          processBase64(e.target.result);
        } else {
          resolve("");
        }
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(input);
    } else {
      processBase64(input);
    }
  });
}
