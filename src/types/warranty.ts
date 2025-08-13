export interface WarrantyTemplate {
  id: string;
  name: string;
  pdf_url: string;
  field_coordinates: FieldCoordinates;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FieldCoordinates {
  customerName?: CoordinatePoint;
  customerAddress?: CoordinatePoint;
  projectAddress?: CoordinatePoint;
  workDescription?: CoordinatePoint;
  date?: CoordinatePoint;
  warranty_years?: CoordinatePoint;
  company_name?: CoordinatePoint;
  [key: string]: CoordinatePoint | undefined;
}

export interface CoordinatePoint {
  x: number;
  y: number;
  fontSize?: number;
  fontColor?: string;
  maxWidth?: number;
}

export interface GeneratedWarranty {
  id: string;
  project_id: string;
  template_id: string;
  generated_pdf_url: string;
  customer_name: string;
  customer_address: string;
  generated_at: string;
  generated_by: string;
}

export interface WarrantyFormData {
  customerName: string;
  customerAddress: string;
  projectAddress: string;
  workDescription: string;
  warrantyYears: number;
  companyName: string;
  date: string;
}