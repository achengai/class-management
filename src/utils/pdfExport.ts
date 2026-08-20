import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export const exportElementToPdf = async (element: HTMLElement, filename = 'SeatPlan.pdf') => {
    // 使用 html-to-image 代替 html2canvas，对 Flex/Grid 布局支持更好，解决文字重叠挤压问题
    const imgData = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2, // 相当于 scale: 2，保证高清
        style: {
            transform: 'scale(1)', // 确保捕获时不带缩放
        }
    });

    // A4 size parameters

    // A4 size parameters
    // Landscape A4 size is 297 mm x 210 mm
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();

    // Margins in mm
    const margin = 10;
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = pdfHeight - margin * 2;

    // Calculate scaling to fit within A4 margins while maintaining aspect ratio
    const imgProps = doc.getImageProperties(imgData);
    const imgRatio = imgProps.width / imgProps.height;
    const pageRatio = contentWidth / contentHeight;

    let renderWidth = contentWidth;
    let renderHeight = contentHeight;

    if (imgRatio > pageRatio) {
        // Image is wider than page ratio
        renderHeight = contentWidth / imgRatio;
    } else {
        // Image is taller than page ratio
        renderWidth = contentHeight * imgRatio;
    }

    // Center horizontally & vertically
    const xOffset = margin + (contentWidth - renderWidth) / 2;
    const yOffset = margin + (contentHeight - renderHeight) / 2;

    doc.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight, undefined, 'FAST');
    doc.save(filename);
};
