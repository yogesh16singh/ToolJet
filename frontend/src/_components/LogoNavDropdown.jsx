import React from 'react';
import { Link } from 'react-router-dom';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { authenticationService } from '@/_services';
import { getPrivateRoute, redirectToDashboard } from '@/_helpers/routes';
import SolidIcon from '@/_ui/Icon/SolidIcons';
import AppLogo from '@/_components/AppLogo';
import { useEditorActions } from '@/_stores/editorStore';

export default function LogoNavDropdown({ darkMode, type = 'apps' }) {
  const { admin } = authenticationService?.currentSessionValue ?? {};
  const isWorkflows = type === 'workflows';
  const workflowsEnabled = admin && window.public_config?.ENABLE_WORKFLOWS_FEATURE == 'true';
  const { updateEditorState } = useEditorActions();

  const handleBackClick = (e) => {
    e.preventDefault();
    updateEditorState({ isLoading: true });
    // Force a reload for clearing interval triggers
    redirectToDashboard();
  };

  const backToLinkProps = isWorkflows ? { to: getPrivateRoute('workflows') } : { onClick: handleBackClick };

  const getOverlay = () => {
    return (
      <div className={`logo-nav-card settings-card card ${darkMode && 'dark-theme'}`}>
        <Link className="dropdown-item tj-text tj-text-xsm" data-cy="back-to-app-option" {...backToLinkProps}>
          <SolidIcon name="arrowbackdown" width="20" viewBox="0 0 20 20" fill="#C1C8CD" />
          <span>Back to {isWorkflows ? 'workflows' : 'apps'}</span>
        </Link>
        <div className="divider"></div>
        {isWorkflows ? (
          <Link target="_blank" to={getPrivateRoute('dashboard')} className="dropdown-item tj-text tj-text-xsm">
            <SolidIcon name={'apps'} width="20" fill="#C1C8CD" />
            <span>{'Apps'}</span>
          </Link>
        ) : (
          workflowsEnabled &&
          admin && (
            <Link target="_blank" to={getPrivateRoute('workflows')} className="dropdown-item tj-text tj-text-xsm">
              <SolidIcon name={'workflows'} width="20" fill="#C1C8CD" />
              <span>{'Workflows'}</span>
            </Link>
          )
        )}

        {window.public_config?.ENABLE_TOOLJET_DB == 'true' && admin && (
          <Link
            target="_blank"
            to={getPrivateRoute('database')}
            className="dropdown-item tj-text tj-text-xsm"
            data-cy="database-option"
          >
            <SolidIcon name="table" width="20" />
            <span>Database</span>
          </Link>
        )}
        <Link
          to={getPrivateRoute('data_sources')}
          className="dropdown-item tj-text tj-text-xsm"
          target="_blank"
          data-cy="data-source-option"
        >
          <SolidIcon name="datasource" width="20" />
          <span>Data sources</span>
        </Link>

        <Link
          to={getPrivateRoute('workspace_constants')}
          className="dropdown-item tj-text tj-text-xsm"
          target="_blank"
          data-cy="workspace-constants-option"
        >
          <SolidIcon name="workspaceconstants" width="20" viewBox="0 0 20 20" />
          <span>Workspace constants</span>
        </Link>
      </div>
    );
  };

  return (
    <OverlayTrigger
      trigger="click"
      placement={'bottom'}
      rootClose={true}
      overlay={getOverlay()}
      style={{ transform: 'translate(5px, 52px)', zIndex: '100' }}
    >
      <div className="cursor-pointer">
        <AppLogo isLoadingFromHeader={false} />
      </div>
    </OverlayTrigger>
  );
}
