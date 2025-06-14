
import { supabase } from "@/integrations/supabase/client";
import { EmailTemplate, EmailTemplateVersion, EmailTemplateCollection } from "@/types/email";

export class TemplateLibraryService {
  static async getTemplates(options?: {
    category?: string;
    search?: string;
    tags?: string[];
    includeSystem?: boolean;
    userId?: string;
  }) {
    let query = supabase
      .from("email_templates")
      .select("*")
      .eq("is_active", true);

    if (options?.userId) {
      if (options.includeSystem) {
        query = query.or(`user_id.eq.${options.userId},is_system_template.eq.true`);
      } else {
        query = query.eq("user_id", options.userId);
      }
    }

    if (options?.category) {
      query = query.eq("category", options.category);
    }

    if (options?.search) {
      query = query.or(`template_name.ilike.%${options.search}%,html_template.ilike.%${options.search}%`);
    }

    if (options?.tags && options.tags.length > 0) {
      query = query.overlaps("tags", options.tags);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return data as EmailTemplate[];
  }

  static async duplicateTemplate(templateId: string, userId: string, newName?: string) {
    const { data: template, error: fetchError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (fetchError) throw fetchError;

    const duplicatedTemplate = {
      user_id: userId,
      template_name: newName || `${template.template_name} (Copy)`,
      category: template.category,
      design_json: template.design_json,
      html_template: template.html_template,
      variables: template.variables,
      tags: template.tags,
      is_public: false,
      is_system_template: false
    };

    const { data, error } = await supabase
      .from("email_templates")
      .insert(duplicatedTemplate)
      .select()
      .single();

    if (error) throw error;
    return data as EmailTemplate;
  }

  static async getTemplateVersions(templateId: string) {
    const { data, error } = await supabase
      .from("email_template_versions")
      .select("*")
      .eq("template_id", templateId)
      .order("version_number", { ascending: false });

    if (error) throw error;
    return data as EmailTemplateVersion[];
  }

  static async restoreVersion(templateId: string, versionId: string) {
    const { data: version, error: versionError } = await supabase
      .from("email_template_versions")
      .select("*")
      .eq("id", versionId)
      .single();

    if (versionError) throw versionError;

    const { data, error } = await supabase
      .from("email_templates")
      .update({
        template_name: version.template_name,
        design_json: version.design_json,
        html_template: version.html_template,
        variables: version.variables
      })
      .eq("id", templateId)
      .select()
      .single();

    if (error) throw error;
    return data as EmailTemplate;
  }

  static async addTags(templateId: string, tags: string[]) {
    const insertPromises = tags.map(tag => 
      supabase
        .from("email_template_tags")
        .insert({ template_id: templateId, tag_name: tag })
    );

    await Promise.all(insertPromises);

    // Update template tags array
    const { data, error } = await supabase
      .from("email_templates")
      .update({ tags })
      .eq("id", templateId)
      .select()
      .single();

    if (error) throw error;
    return data as EmailTemplate;
  }

  static async createCollection(userId: string, name: string, description?: string) {
    const { data, error } = await supabase
      .from("email_template_collections")
      .insert({
        user_id: userId,
        collection_name: name,
        description
      })
      .select()
      .single();

    if (error) throw error;
    return data as EmailTemplateCollection;
  }

  static async addToCollection(collectionId: string, templateId: string) {
    const { error } = await supabase
      .from("email_template_collection_items")
      .insert({
        collection_id: collectionId,
        template_id: templateId
      });

    if (error) throw error;
  }

  static async recordUsage(templateId: string, userId?: string, campaignId?: string) {
    await supabase
      .from("email_template_usage")
      .insert({
        template_id: templateId,
        used_by: userId,
        used_in_campaign: campaignId
      });

    // Update usage count
    await supabase.rpc('increment_template_usage', { template_id: templateId });
  }

  static async rateTemplate(templateId: string, rating: number) {
    const { data: template } = await supabase
      .from("email_templates")
      .select("rating, rating_count")
      .eq("id", templateId)
      .single();

    if (template) {
      const newRatingCount = (template.rating_count || 0) + 1;
      const newRating = ((template.rating || 0) * (template.rating_count || 0) + rating) / newRatingCount;

      await supabase
        .from("email_templates")
        .update({
          rating: newRating,
          rating_count: newRatingCount
        })
        .eq("id", templateId);
    }
  }
}
