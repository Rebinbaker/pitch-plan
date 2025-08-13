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
    // Download the template image
    const { data: templateData } = await supabase.storage
      .from('warranty-templates')
      .download(template.pdf_url);

    if (!templateData) {
      throw new Error('Could not download template image');
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Convert blob to array buffer and embed image
    const templateBytes = await templateData.arrayBuffer();
    
    // Determine image type and embed accordingly
    let image;
    if (template.pdf_url.toLowerCase().includes('.png')) {
      image = await pdfDoc.embedPng(templateBytes);
    } else {
      image = await pdfDoc.embedJpg(templateBytes);
    }
    
    // Add a page with the image as background
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
    
    // Use the page we just created
    const { height } = page.getSize();

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

      // Map coordinate field names to warranty data field names
      const fieldMapping: Record<string, keyof WarrantyFormData> = {
        customerName: 'customerName',
        customerAddress: 'customerAddress', 
        projectAddress: 'projectAddress',
        workDescription: 'workDescription',
        date: 'date',
        warranty_years: 'warrantyYears',
        company_name: 'companyName'
      };

      const mappedFieldName = fieldMapping[fieldName];
      if (!mappedFieldName) return;

      const value = warrantyData[mappedFieldName];
      if (value) {
        console.log(`Adding text "${value}" at coordinates:`, coordinates);
        // Convert from PDF coordinate system (origin at bottom-left) to our system
        const yPos = height - coordinates.y;
        
        page.drawText(String(value), {
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
    // Get current session first to ensure we have valid auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Warranty: session check result:', { session: session?.user?.id, sessionError });
    
    if (!session?.user || sessionError) {
      throw new Error('User not authenticated - no valid session');
    }
    
    const user = session.user;
    console.log('Warranty: authenticated user:', user.id);

    // Upload PDF to storage with user folder structure
    const filePath = `${user.id}/${fileName}`;
    console.log('Warranty: uploading to path:', filePath);
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