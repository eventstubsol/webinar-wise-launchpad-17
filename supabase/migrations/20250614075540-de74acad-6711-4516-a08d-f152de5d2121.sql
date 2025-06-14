
-- 1. Enums for workflow engine
CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE workflow_trigger_type AS ENUM ('time_based', 'event_based', 'webhook', 'manual');
CREATE TYPE workflow_action_type AS ENUM ('email', 'sms', 'webhook', 'crm_update', 'delay', 'condition', 'ai_analysis');
CREATE TYPE workflow_execution_state AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled', 'paused', 'retrying', 'skipped');
CREATE TYPE workflow_permission_level AS ENUM ('owner', 'editor', 'viewer', 'executor');
CREATE TYPE workflow_template_category AS ENUM ('registration', 'engagement', 'follow_up', 'analytics', 'custom');
CREATE TYPE workflow_variable_type AS ENUM ('string', 'number', 'boolean', 'object', 'array');
CREATE TYPE workflow_audit_action_type AS ENUM ('created', 'updated', 'deleted', 'triggered', 'paused', 'resumed');
CREATE TYPE workflow_audit_entity_type AS ENUM ('workflow', 'trigger', 'action', 'execution', 'permission');

-- 2. Core workflow definition tables
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    team_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    workflow_definition JSONB NOT NULL,
    schema_version TEXT NOT NULL DEFAULT '1.0',
    status workflow_status NOT NULL DEFAULT 'draft',
    is_template BOOLEAN NOT NULL DEFAULT false,
    trigger_count INTEGER NOT NULL DEFAULT 0,
    success_rate NUMERIC,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    trigger_type workflow_trigger_type NOT NULL,
    trigger_config JSONB NOT NULL,
    conditions JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER DEFAULT 0,
    cooldown_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    action_type workflow_action_type NOT NULL,
    action_config JSONB NOT NULL,
    execution_order INTEGER NOT NULL DEFAULT 0,
    retry_config JSONB,
    timeout_seconds INTEGER,
    depends_on_action_id UUID REFERENCES workflow_actions(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Workflow execution/state/audit tables

CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    trigger_id UUID REFERENCES workflow_triggers(id),
    context_data JSONB,
    execution_state workflow_execution_state NOT NULL DEFAULT 'pending',
    current_action_id UUID REFERENCES workflow_actions(id),
    progress_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_action_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES workflow_actions(id),
    execution_state workflow_execution_state NOT NULL DEFAULT 'pending',
    input_data JSONB,
    output_data JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Templates, permissions, variables, audit log

CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    category workflow_template_category NOT NULL,
    template_config JSONB NOT NULL,
    supported_triggers JSONB,
    supported_actions JSONB,
    usage_count INTEGER DEFAULT 0,
    rating NUMERIC,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_public BOOLEAN NOT NULL DEFAULT false,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    team_id UUID,
    permission_level workflow_permission_level NOT NULL,
    granted_by UUID REFERENCES profiles(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE workflow_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES workflow_executions(id),
    variable_name TEXT NOT NULL,
    variable_value JSONB,
    variable_type workflow_variable_type NOT NULL,
    scope TEXT NOT NULL DEFAULT 'workflow',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id),
    execution_id UUID REFERENCES workflow_executions(id),
    user_id UUID REFERENCES profiles(id),
    action_type workflow_audit_action_type NOT NULL,
    entity_type workflow_audit_entity_type NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Indexes and useful constraints for performance

CREATE INDEX idx_workflow_triggers_workflow_id ON workflow_triggers(workflow_id);
CREATE INDEX idx_workflow_actions_workflow_id ON workflow_actions(workflow_id);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_state ON workflow_executions(execution_state);
CREATE INDEX idx_workflow_action_executions_execution_id ON workflow_action_executions(execution_id);
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_permissions_workflow_id ON workflow_permissions(workflow_id);

-- 6. RLS and permission setup is recommended after verifying schema operation
