import UQRCode from 'uqrcodejs';

export function drawQrCode(canvasId: string, text: string, size = 220) {
  if (!text) return;
  const qr = new UQRCode();
  qr.data = text;
  qr.size = size;
  qr.make();
  const ctx = uni.createCanvasContext(canvasId);
  qr.canvasContext = ctx;
  qr.drawCanvas();
}
