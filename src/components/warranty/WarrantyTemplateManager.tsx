import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WarrantyTemplate } from '@/types/warranty';
import { PDFCoordinateEditor } from './PDFCoordinateEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const WarrantyTemplateManager = () => {
  const [templates, setTemplates] = useState<WarrantyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<WarrantyTemplate | null>(null);
  const [showCoordinateEditor, setShowCoordinateEditor] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('warranty_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as unknown as WarrantyTemplate[]);
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadingFile(file);
    } else {
      toast({
        title: "Fel filformat",
        description: "Vänligen välj en PDF-fil",
        variant: "destructive",
      });
    }
  };

  const uploadTemplate = async () => {
    if (!uploadingFile || !templateName.trim()) {
      toast({
        title: "Saknad information",
        description: "Vänligen ange mallnamn och välj en PDF-fil",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Upload PDF to storage
      const fileName = `${Date.now()}_${uploadingFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('warranty-templates')
        .upload(fileName, uploadingFile);

      if (uploadError) throw uploadError;

      // Save template to database
      const { data: templateData, error: dbError } = await supabase
        .from('warranty_templates')
        .insert({
          name: templateName,
          pdf_url: uploadData.path,
          field_coordinates: {} as any,
          created_by: user.user.id
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: "Mall uppladdad",
        description: "Garantimall har sparats. Nu kan du ställa in koordinater.",
      });

      setUploadingFile(null);
      setTemplateName('');
      loadTemplates();

      // Open coordinate editor for new template
      setEditingTemplate(templateData as unknown as WarrantyTemplate);
      setShowCoordinateEditor(true);
    } catch (error) {
      console.error('Error uploading template:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda upp mall",
        variant: "destructive",
      });
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('warranty_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Mall borttagen",
        description: "Garantimall har tagits bort",
      });

      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ta bort mall",
        variant: "destructive",
      });
    }
  };

  const openCoordinateEditor = (template: WarrantyTemplate) => {
    setEditingTemplate(template);
    setShowCoordinateEditor(true);
  };

  const handleCoordinatesSaved = () => {
    setShowCoordinateEditor(false);
    setEditingTemplate(null);
    loadTemplates();
  };

  if (loading) {
    return <div className="flex justify-center p-8">Laddar mallar...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ladda upp ny garantimall</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="template-name">Mallnamn</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="T.ex. Takgaranti Standard"
            />
          </div>
          <div>
            <Label htmlFor="pdf-upload">PDF-fil</Label>
            <Input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
            />
          </div>
          {uploadingFile && (
            <p className="text-sm text-muted-foreground">
              Vald fil: {uploadingFile.name}
            </p>
          )}
          <Button onClick={uploadTemplate} disabled={!uploadingFile || !templateName.trim()}>
            <Upload className="w-4 h-4 mr-2" />
            Ladda upp mall
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="text-lg">{template.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Badge variant="outline">
                  {Object.keys(template.field_coordinates).length} koordinater
                </Badge>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCoordinateEditor(template)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Redigera
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Ta bort
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCoordinateEditor} onOpenChange={setShowCoordinateEditor}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Ställ in koordinater för {editingTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <PDFCoordinateEditor
              template={editingTemplate}
              onSave={handleCoordinatesSaved}
              onCancel={() => setShowCoordinateEditor(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};