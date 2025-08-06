import jsPDF from 'jspdf';
import { Project } from '@/types/project';
import { ProjectFile } from '@/types/files';

export const generateProjectReport = async (
  project: Project, 
  files: ProjectFile[] = []
): Promise<{ pdf: jsPDF; fileName: string }> => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper function to add text with word wrap
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const lines = pdf.splitTextToSize(text, options.maxWidth || pageWidth - 40);
    pdf.text(lines, x, y);
    return y + (lines.length * (options.lineHeight || 6));
  };

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }
  };

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  yPosition = addText('PROJECT REPORT', 20, yPosition);
  yPosition += 10;

  // Project Info Section
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  yPosition = addText('PROJECT INFORMATION', 20, yPosition);
  yPosition += 5;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  yPosition = addText(`Project Name: ${project.name}`, 20, yPosition);
  yPosition = addText(`Address: ${project.address}`, 20, yPosition);
  yPosition = addText(`Customer: ${project.customerName}`, 20, yPosition);
  yPosition = addText(`Phone: ${project.customerPhone}`, 20, yPosition);
  yPosition = addText(`Assigned Team: ${project.constructionTeam}`, 20, yPosition);
  yPosition = addText(`Start Date: ${project.startDate}`, 20, yPosition);
  yPosition = addText(`Deadline: ${project.deadline}`, 20, yPosition);
  yPosition = addText(`Status: ${project.status.toUpperCase()}`, 20, yPosition);
  yPosition += 10;

  // ROT Section
  checkNewPage(30);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  yPosition = addText('ROT DEDUCTION STATUS', 20, yPosition);
  yPosition += 5;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  const rotStatus = project.rotStatus === 'Yes' ? 'ROT Applied' : 'Not Applied';
  yPosition = addText(`Status: ${rotStatus}`, 20, yPosition);
  if (project.rotStatus === 'Yes') {
    yPosition = addText('ROT Amount: To be calculated based on final invoice', 20, yPosition);
  }
  yPosition += 10;

  // Project Description
  if (project.notes) {
    checkNewPage(40);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    yPosition = addText('PROJECT DESCRIPTION', 20, yPosition);
    yPosition += 5;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    yPosition = addText(project.notes, 20, yPosition, { maxWidth: pageWidth - 40 });
    yPosition += 10;
  }

  // Work Completed Checklist
  checkNewPage(60);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  yPosition = addText('WORK COMPLETED CHECKLIST', 20, yPosition);
  yPosition += 5;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  const completedTasks = project.checklist.filter(item => item.completed);
  if (completedTasks.length > 0) {
    completedTasks.forEach(task => {
      yPosition = addText(`✓ ${task.label}${task.completedAt ? ` (${task.completedAt})` : ''}`, 25, yPosition);
    });
  } else {
    yPosition = addText('No tasks completed yet.', 25, yPosition);
  }
  yPosition += 10;

  // Before/After Images Section
  checkNewPage(50);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  yPosition = addText('BEFORE/AFTER IMAGES', 20, yPosition);
  yPosition += 5;

  const imageFiles = files.filter(file => file.type === 'photo');
  if (imageFiles.length > 0) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    yPosition = addText(`${imageFiles.length} image(s) attached to this project`, 20, yPosition);
    
    // Add placeholders for images (actual image embedding would require more complex handling)
    imageFiles.slice(0, 4).forEach((file, index) => {
      if (index % 2 === 0) {
        checkNewPage(60);
        // Left column (Before)
        pdf.rect(20, yPosition, 80, 40);
        pdf.text(`Image: ${file.name}`, 25, yPosition + 45);
        
        // Right column (After) if there's a next image
        if (imageFiles[index + 1]) {
          pdf.rect(110, yPosition, 80, 40);
          pdf.text(`Image: ${imageFiles[index + 1].name}`, 115, yPosition + 45);
        }
        yPosition += 55;
      }
    });
  } else {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    yPosition = addText('No images available for this project.', 20, yPosition);
  }
  yPosition += 15;

  // Signature Section
  checkNewPage(40);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  yPosition = addText('CUSTOMER APPROVAL', 20, yPosition);
  yPosition += 15;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  // Signature line
  pdf.line(20, yPosition, 120, yPosition);
  yPosition = addText('Customer Signature', 20, yPosition + 5);
  yPosition += 15;

  // Date line
  pdf.line(130, yPosition - 20, 180, yPosition - 20);
  yPosition = addText('Date', 130, yPosition - 15);

  // Generate filename
  const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;

  return { pdf, fileName };
};

export const downloadProjectReport = async (project: Project, files: ProjectFile[] = []) => {
  try {
    const { pdf, fileName } = await generateProjectReport(project, files);
    pdf.save(fileName);
    return { success: true, fileName };
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return { success: false, error: 'Failed to generate PDF report' };
  }
};