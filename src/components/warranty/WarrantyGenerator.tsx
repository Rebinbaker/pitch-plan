import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WarrantyTemplate, WarrantyFormData } from '@/types/warranty';
import { Project } from '@/types/project';
import { generateWarrantyPDF, uploadGeneratedWarranty, downloadWarranty } from '@/utils/warrantyGenerator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WarrantyGeneratorProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onGenerated: () => void;
  onFileUploaded?: (file: { name: string; url: string; type: 'warranty'; projectId: string; uploadedBy: string; description?: string; tags: string[] }) => void;
}

export const WarrantyGenerator: React.FC<WarrantyGeneratorProps> = ({
  project,
  isOpen,
  onClose,
  onGenerated,
  onFileUploaded,
}) => {
  const [templates, setTemplates] = useState<WarrantyTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [formData, setFormData] = useState<WarrantyFormData>({
    customerName: project.customerName || '',
    customerAddress: project.address || '',
    projectAddress: project.address || '',
    workDescription: project.notes || 'Takarbeten enligt överenskommelse',
    warrantyYears: 10,
    companyName: 'Lokala Hantverkarna AB',
    date: new Date().toLocaleDateString('sv-SE'),
  });
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('warranty_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as unknown as WarrantyTemplate[]);
      
      if (data && data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda garantimallar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof WarrantyFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateAndDownload = async () => {
    if (!selectedTemplateId) {
      toast({
        title: "Ingen mall vald",
        description: "Vänligen välj en garantimall",
        variant: "destructive",
      });
      return;
    }

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) {
      toast({
        title: "Mall hittades inte",
        description: "Den valda mallen kunde inte hittas",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      // Generate PDF
      const { pdfBytes, fileName } = await generateWarrantyPDF(
        selectedTemplate,
        project,
        formData
      );

      // Upload to storage and save record
      const filePath = await uploadGeneratedWarranty(
        pdfBytes,
        fileName,
        project.id,
        selectedTemplateId,
        formData.customerName,
        formData.customerAddress
      );

      // Save to project files if callback provided
      if (onFileUploaded) {
        const { data: { publicUrl } } = supabase.storage
          .from('generated-warranties')
          .getPublicUrl(filePath);
        
        onFileUploaded({
          name: "Garantibevis 10 år.pdf", // Visa det fina namnet för användaren
          url: publicUrl,
          type: 'warranty',
          projectId: project.id,
          uploadedBy: 'System',
          description: 'Garantibevis 10 år',
          tags: ['guaranty', 'certificate']
        });
      }

      // Download the file
      await downloadWarranty(filePath);

      toast({
        title: "Garantibevis genererat",
        description: "Garantibeviset har skapats och sparats",
      });

      onGenerated();
      onClose();
    } catch (error) {
      console.error('Error generating warranty:', error);
      toast({
        title: "Fel",
        description: "Kunde inte generera garantibevis",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const previewAndGenerate = async () => {
    if (!selectedTemplateId) return;

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) return;

    try {
      const { pdfBytes, fileName } = await generateWarrantyPDF(
        selectedTemplate,
        project,
        formData
      );

      // Create blob URL for preview
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Open in new tab for preview
      window.open(url, '_blank');
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: "Fel",
        description: "Kunde inte generera förhandsvisning",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <FileText className="w-5 h-5 mr-2 inline" />
            Generera garantibevis för {project.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Inga garantimallar tillgängliga. Kontakta administratören för att ladda upp mallar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div>
                <Label>Välj garantimall</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj mall" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Kundnamn</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="customerAddress">Kundadress</Label>
                  <Input
                    id="customerAddress"
                    value={formData.customerAddress}
                    onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="projectAddress">Projektadress</Label>
                  <Input
                    id="projectAddress"
                    value={formData.projectAddress}
                    onChange={(e) => handleInputChange('projectAddress', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="warrantyYears">Garantiår</Label>
                  <Input
                    id="warrantyYears"
                    type="number"
                    value={formData.warrantyYears}
                    onChange={(e) => handleInputChange('warrantyYears', parseInt(e.target.value) || 10)}
                  />
                </div>

                <div>
                  <Label htmlFor="companyName">Företagsnamn</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="date">Datum</Label>
                  <Input
                    id="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="workDescription">Arbetsbeskrivning</Label>
                <Textarea
                  id="workDescription"
                  value={formData.workDescription}
                  onChange={(e) => handleInputChange('workDescription', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={previewAndGenerate}
                  disabled={!selectedTemplateId}
                >
                  Förhandsgranska
                </Button>
                <Button
                  onClick={generateAndDownload}
                  disabled={!selectedTemplateId || generating}
                  className="flex-1"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {generating ? 'Genererar...' : 'Generera och ladda ner'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};