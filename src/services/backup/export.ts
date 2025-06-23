import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface ExportOptions {
  tables?: string[];
  format?: 'json' | 'csv' | 'excel';
  includeMetadata?: boolean;
  compress?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
    column?: string;
  };
}

export interface ExportResult {
  success: boolean;
  fileName: string;
  tables: string[];
  recordCount: Record<string, number>;
  exportedAt: Date;
  error?: string;
}

export class DataExportService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  /**
   * Export data from specified tables
   */
  async exportData(options: ExportOptions = {}): Promise<ExportResult> {
    const {
      tables = ['zoom_webinars', 'zoom_participants', 'zoom_registrants'],
      format = 'json',
      includeMetadata = true,
      compress = true,
      dateRange
    } = options;

    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
    const fileName = `webinar_wise_export_${timestamp}`;
    const recordCount: Record<string, number> = {};

    try {
      const exportData: Record<string, any> = {};

      // Export each table
      for (const table of tables) {
        const data = await this.exportTable(table, dateRange);
        exportData[table] = data;
        recordCount[table] = data.length;
      }

      // Add metadata if requested
      if (includeMetadata) {
        exportData._metadata = {
          exportedAt: new Date().toISOString(),
          tables,
          recordCount,
          version: '1.0',
          dateRange: dateRange ? {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString(),
            column: dateRange.column
          } : null
        };
      }

      // Format and save the data
      let file: Blob;
      let finalFileName = fileName;

      switch (format) {
        case 'csv':
          file = await this.exportAsCSV(exportData, compress);
          finalFileName += compress ? '.zip' : '.csv';
          break;
        
        case 'excel':
          file = await this.exportAsExcel(exportData);
          finalFileName += '.xlsx';
          break;
        
        case 'json':
        default:
          file = await this.exportAsJSON(exportData, compress);
          finalFileName += compress ? '.json.gz' : '.json';
          break;
      }

      // Trigger download
      saveAs(file, finalFileName);

      return {
        success: true,
        fileName: finalFileName,
        tables,
        recordCount,
        exportedAt: new Date()
      };

    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        fileName: '',
        tables,
        recordCount,
        exportedAt: new Date(),
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Export a single table
   */
  private async exportTable(
    tableName: string,
    dateRange?: ExportOptions['dateRange']
  ): Promise<any[]> {
    let query = this.supabase.from(tableName).select('*');

    // Apply date range filter if provided
    if (dateRange) {
      const column = dateRange.column || 'created_at';
      query = query
        .gte(column, dateRange.from.toISOString())
        .lte(column, dateRange.to.toISOString());
    }

    // Get user's connections to filter data
    const { data: connections } = await this.supabase
      .from('zoom_connections')
      .select('id')
      .eq('user_id', (await this.supabase.auth.getUser()).data.user?.id);

    if (connections && connections.length > 0) {
      const connectionIds = connections.map(c => c.id);
      
      // Apply connection filter based on table
      switch (tableName) {
        case 'zoom_webinars':
        case 'zoom_participants':
          query = query.in('connection_id', connectionIds);
          break;
        case 'zoom_registrants':
          // Need to join through webinars
          const { data: webinars } = await this.supabase
            .from('zoom_webinars')
            .select('id')
            .in('connection_id', connectionIds);
          
          if (webinars) {
            query = query.in('webinar_id', webinars.map(w => w.id));
          }
          break;
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to export ${tableName}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Export as JSON (with optional compression)
   */
  private async exportAsJSON(
    data: Record<string, any>,
    compress: boolean
  ): Promise<Blob> {
    const jsonString = JSON.stringify(data, null, 2);
    
    if (compress) {
      // Use browser-compatible compression
      const zip = new JSZip();
      zip.file('export.json', jsonString);
      return await zip.generateAsync({ type: 'blob' });
    }

    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Export as CSV (multiple files in a zip)
   */
  private async exportAsCSV(
    data: Record<string, any>,
    compress: boolean
  ): Promise<Blob> {
    const zip = new JSZip();

    for (const [table, records] of Object.entries(data)) {
      if (table === '_metadata') continue;
      
      const csv = Papa.unparse(records, {
        header: true,
        delimiter: ',',
        newline: '\n'
      });

      if (compress) {
        zip.file(`${table}.csv`, csv);
      } else {
        // For single table export without compression
        return new Blob([csv], { type: 'text/csv' });
      }
    }

    return await zip.generateAsync({ type: 'blob' });
  }

  /**
   * Export as Excel
   */
  private async exportAsExcel(data: Record<string, any>): Promise<Blob> {
    // Dynamic import for Excel export
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Add metadata sheet
    if (data._metadata) {
      const metaSheet = workbook.addWorksheet('_metadata');
      metaSheet.addRow(['Property', 'Value']);
      Object.entries(data._metadata).forEach(([key, value]) => {
        metaSheet.addRow([key, JSON.stringify(value)]);
      });
    }

    // Add data sheets
    for (const [table, records] of Object.entries(data)) {
      if (table === '_metadata') continue;
      
      const worksheet = workbook.addWorksheet(table);
      
      if (records.length > 0) {
        // Add headers
        const headers = Object.keys(records[0]);
        worksheet.addRow(headers);
        
        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        
        // Add data
        records.forEach((record: any) => {
          worksheet.addRow(Object.values(record));
        });
        
        // Auto-fit columns
        worksheet.columns.forEach(column => {
          column.width = 15;
        });
      }
    }

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  /**
   * Export specific webinar data
   */
  async exportWebinar(webinarId: string, options: ExportOptions = {}): Promise<ExportResult> {
    try {
      // Get webinar details
      const { data: webinar } = await this.supabase
        .from('zoom_webinars')
        .select('*')
        .eq('id', webinarId)
        .single();

      if (!webinar) {
        throw new Error('Webinar not found');
      }

      // Get related data
      const { data: participants } = await this.supabase
        .from('zoom_participants')
        .select('*')
        .eq('webinar_id', webinarId);

      const { data: registrants } = await this.supabase
        .from('zoom_registrants')
        .select('*')
        .eq('webinar_id', webinarId);

      const { data: polls } = await this.supabase
        .from('zoom_polls')
        .select('*, zoom_poll_responses(*)')
        .eq('webinar_id', webinarId);

      const { data: qna } = await this.supabase
        .from('zoom_qna')
        .select('*')
        .eq('webinar_id', webinarId);

      const exportData = {
        webinar,
        participants: participants || [],
        registrants: registrants || [],
        polls: polls || [],
        qna: qna || []
      };

      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
      const fileName = `webinar_${webinar.topic.replace(/[^a-z0-9]/gi, '_')}_${timestamp}`;

      return await this.formatAndSave(exportData, fileName, options);

    } catch (error) {
      console.error('Webinar export failed:', error);
      return {
        success: false,
        fileName: '',
        tables: [],
        recordCount: {},
        exportedAt: new Date(),
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Format and save export data
   */
  private async formatAndSave(
    data: any,
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const { format = 'json', compress = true } = options;
    let file: Blob;
    let finalFileName = fileName;

    switch (format) {
      case 'csv':
        file = await this.exportAsCSV(data, compress);
        finalFileName += compress ? '.zip' : '.csv';
        break;
      
      case 'excel':
        file = await this.exportAsExcel(data);
        finalFileName += '.xlsx';
        break;
      
      case 'json':
      default:
        file = await this.exportAsJSON(data, compress);
        finalFileName += compress ? '.json.gz' : '.json';
        break;
    }

    saveAs(file, finalFileName);

    const tables = Object.keys(data).filter(k => k !== '_metadata');
    const recordCount = tables.reduce((acc, table) => {
      acc[table] = Array.isArray(data[table]) ? data[table].length : 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      fileName: finalFileName,
      tables,
      recordCount,
      exportedAt: new Date()
    };
  }

  /**
   * Schedule automatic exports
   */
  async scheduleExport(
    schedule: 'daily' | 'weekly' | 'monthly',
    options: ExportOptions
  ): Promise<void> {
    // This would integrate with a job scheduler or Supabase Edge Functions
    // For now, we'll store the schedule preference
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) throw new Error('User not authenticated');

    await this.supabase.from('export_schedules').upsert({
      user_id: user.id,
      schedule,
      options,
      active: true,
      updated_at: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const dataExportService = new DataExportService(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
