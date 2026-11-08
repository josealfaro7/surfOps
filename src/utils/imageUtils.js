/**
 * Comprime y redimensiona una imagen (ej. foto de Carnet de Identidad) en el navegador
 * usando un elemento <canvas> antes de convertirla a Base64, protegiendo el límite
 * de 5 MB de localStorage (maxWidth = 400, quality = 0.5).
 */
export function compressImageFileToBase64(file, maxWidth = 400, quality = 0.5) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No se seleccionó ningún archivo de imagen.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo seleccionado no es una imagen válida.'));
      img.onload = () => {
        try {
          let targetWidth = img.width || maxWidth;
          let targetHeight = img.height || maxWidth;

          if (targetWidth > maxWidth) {
            const ratio = maxWidth / targetWidth;
            targetWidth = maxWidth;
            targetHeight = Math.max(1, Math.round(targetHeight * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(event.target?.result || ''));
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = String(event.target?.result || '');
    };

    reader.readAsDataURL(file);
  });
}
