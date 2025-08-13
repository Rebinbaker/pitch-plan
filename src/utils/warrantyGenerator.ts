import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { WarrantyTemplate, WarrantyFormData, CoordinatePoint } from '@/types/warranty';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types/project';

export const generateWarrantyPDF = async (
  template: WarrantyTemplate,
  project: Project,
  customData?: Partial<WarrantyFormData>
): Promise<{ pdfBytes: Uint8Array; fileName: string }> => {
  try {
    // Download the template PDF
    const { data: templateData } = await supabase.storage
      .from('warranty-templates')
      .download(template.pdf_url);

    if (!templateData) {
      throw new Error('Could not download template PDF');
    }

    // Convert blob to array buffer
    const templateBytes = await templateData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    // Get the first page (assuming single page warranty)
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { height } = firstPage.getSize();

    // Load font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Prepare data to fill
    const warrantyData: WarrantyFormData = {
      customerName: customData?.customerName || project.customerName || '',
      customerAddress: customData?.customerAddress || project.address || '',
      projectAddress: customData?.projectAddress || project.address || '',
      workDescription: customData?.workDescription || project.notes || 'Takarbeten enligt överenskommelse',
      warrantyYears: customData?.warrantyYears || 10,
      companyName: customData?.companyName || 'Lokala Hantverkarna AB',
      date: customData?.date || new Date().toLocaleDateString('sv-SE'),
    };

    // Fill in the text fields based on coordinates
    Object.entries(template.field_coordinates).forEach(([fieldName, coordinates]) => {
      if (!coordinates) return;

      const value = warrantyData[fieldName as keyof WarrantyFormData];
      if (value) {
        // Convert from PDF coordinate system (origin at bottom-left) to our system
        const yPos = height - coordinates.y;
        
        firstPage.drawText(String(value), {
          x: coordinates.x,
          y: yPos,
          size: coordinates.fontSize || 12,
          font: font,
          color: rgb(0, 0, 0),
          maxWidth: coordinates.maxWidth || 200,
        });
      }
    });

    const pdfBytes = await pdfDoc.save();
    const fileName = `Garantibevis_${project.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    return { pdfBytes, fileName };
  } catch (error) {
    console.error('Error generating warranty PDF:', error);
    throw new Error('Failed to generate warranty certificate');
  }
};

export const uploadGeneratedWarranty = async (
  pdfBytes: Uint8Array,
  fileName: string,
  projectId: string,
  templateId: string,
  customerName: string,
  customerAddress: string
): Promise<string> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Warranty: auth check result:', { user: user?.id, authError });
    if (!user || authError) throw new Error('User not authenticated');

    // Upload PDF to storage
    const filePath = `${user.id}/${fileName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated-warranties')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Save warranty record to database
    const { data: warrantyData, error: dbError } = await supabase
      .from('generated_warranties')
      .insert({
        project_id: projectId,
        template_id: templateId,
        generated_pdf_url: uploadData.path,
        customer_name: customerName,
        customer_address: customerAddress,
        generated_by: user.id
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return uploadData.path;
  } catch (error) {
    console.error('Error uploading generated warranty:', error);
    throw error; // Re-throw the original error instead of generic message
  }
};

export const downloadWarranty = async (filePath: string): Promise<void> => {
  try {
    const { data, error } = await supabase.storage
      .from('generated-warranties')
      .download(filePath);

    if (error) throw error;

    // Create download link
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filePath.split('/').pop() || 'warranty.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading warranty:', error);
    throw new Error('Failed to download warranty certificate');
  }
};