const vscode = require("vscode");
const {
  DEFAULT_THEME_ID,
  THEME_DEFINITIONS,
  getTheme,
  replaceManagedStylesheet
} = require("./lib/theme-config");

const MANAGED_STYLESHEET_STATE_KEY = "markdownPreviewThemes.managedStylesheet";
const SELECTED_THEME_SETTING = "selectedTheme";

let isApplyingTheme = false;

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("markdownPreviewThemes.selectTheme", async () => {
      await selectThemeWithLivePreview(context);
    }),
    vscode.commands.registerCommand("markdownPreviewThemes.resetTheme", async () => {
      await applyTheme(context, DEFAULT_THEME_ID, { showConfirmation: true });
    }),
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (isApplyingTheme || !event.affectsConfiguration("markdownPreviewThemes.selectedTheme")) {
        return;
      }

      const themeId = vscode.workspace
        .getConfiguration("markdownPreviewThemes")
        .get(SELECTED_THEME_SETTING, DEFAULT_THEME_ID);

      await applyTheme(context, themeId, { showConfirmation: false });
    })
  );

  void syncConfiguredTheme(context);
}

async function syncConfiguredTheme(context) {
  const themeId = vscode.workspace
    .getConfiguration("markdownPreviewThemes")
    .get(SELECTED_THEME_SETTING, DEFAULT_THEME_ID);
  const previousStylesheet = context.globalState.get(MANAGED_STYLESHEET_STATE_KEY);

  if (themeId !== DEFAULT_THEME_ID || previousStylesheet) {
    await applyTheme(context, themeId, { showConfirmation: false });
  }
}

async function selectThemeWithLivePreview(context) {
  const initialThemeId = vscode.workspace
    .getConfiguration("markdownPreviewThemes")
    .get(SELECTED_THEME_SETTING, DEFAULT_THEME_ID);
  const quickPick = vscode.window.createQuickPick();
  const items = THEME_DEFINITIONS.map((theme) => ({
    label: theme.label,
    description: theme.id === initialThemeId ? "Current" : undefined,
    detail: theme.description,
    themeId: theme.id
  }));
  let accepted = false;
  let lastPreviewedThemeId = initialThemeId;
  let previewQueue = Promise.resolve();

  quickPick.title = "Markdown Preview Themes";
  quickPick.placeholder = "Move through themes for a live preview. Press Enter to keep one.";
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;
  quickPick.items = items;
  quickPick.activeItems = items.filter((item) => item.themeId === initialThemeId);

  const enqueuePreview = (themeId, options = {}) => {
    if (themeId === lastPreviewedThemeId && !options.force) {
      return previewQueue;
    }

    lastPreviewedThemeId = themeId;
    previewQueue = previewQueue
      .then(() =>
        applyTheme(context, themeId, {
          persistManagedStylesheet: options.persistManagedStylesheet ?? false,
          persistSelection: options.persistSelection ?? false,
          showConfirmation: options.showConfirmation ?? false
        })
      )
      .catch((error) => {
        void vscode.window.showErrorMessage(`Unable to preview Markdown theme: ${error.message}`);
      });

    return previewQueue;
  };

  quickPick.onDidChangeActive((activeItems) => {
    const activeTheme = activeItems[0];
    if (activeTheme) {
      void enqueuePreview(activeTheme.themeId);
    }
  });

  quickPick.onDidAccept(async () => {
    const selectedTheme = quickPick.activeItems[0];
    if (!selectedTheme) {
      return;
    }

    accepted = true;
    quickPick.busy = true;

    await previewQueue;
    await enqueuePreview(selectedTheme.themeId, {
      force: true,
      persistManagedStylesheet: true,
      persistSelection: true,
      showConfirmation: true
    });

    quickPick.busy = false;
    quickPick.hide();
  });

  quickPick.onDidHide(async () => {
    if (!accepted) {
      await previewQueue;
      await enqueuePreview(initialThemeId, {
        force: true,
        persistManagedStylesheet: true
      });
    }

    quickPick.dispose();
  });

  quickPick.show();
}

async function applyTheme(context, themeId, options = {}) {
  const theme = getTheme(themeId);
  const persistManagedStylesheet = options.persistManagedStylesheet ?? true;
  const persistSelection = options.persistSelection ?? true;

  if (!theme) {
    void vscode.window.showErrorMessage(`Unknown Markdown preview theme: ${themeId}`);
    return;
  }

  isApplyingTheme = true;

  try {
    const resource = vscode.window.activeTextEditor?.document.uri;
    const markdownConfiguration = vscode.workspace.getConfiguration("markdown", resource);
    const configurationTarget = getStylesConfigurationTarget(markdownConfiguration);
    const styles = getStylesAtTarget(markdownConfiguration, configurationTarget);
    const previousStylesheet = context.globalState.get(MANAGED_STYLESHEET_STATE_KEY);
    const nextStylesheet =
      theme.id === DEFAULT_THEME_ID
        ? undefined
        : vscode.Uri.joinPath(context.extensionUri, ...theme.stylesheet.split("/")).fsPath;
    const updatedStyles = replaceManagedStylesheet(styles, nextStylesheet, previousStylesheet);

    if (!arraysEqual(styles, updatedStyles)) {
      await markdownConfiguration.update("styles", updatedStyles, configurationTarget);
    }

    if (persistManagedStylesheet) {
      await context.globalState.update(MANAGED_STYLESHEET_STATE_KEY, nextStylesheet);
    }

    if (persistSelection) {
      const extensionConfiguration = vscode.workspace.getConfiguration("markdownPreviewThemes");
      if (extensionConfiguration.get(SELECTED_THEME_SETTING) !== theme.id) {
        await extensionConfiguration.update(
          SELECTED_THEME_SETTING,
          theme.id,
          getSelectedThemeConfigurationTarget(extensionConfiguration)
        );
      }
    }

    await refreshMarkdownPreview();

    if (options.showConfirmation) {
      const scope = getConfigurationTargetLabel(configurationTarget);
      void vscode.window.showInformationMessage(
        `Markdown preview theme: ${theme.label}. Applied to ${scope} settings.`
      );
    }
  } finally {
    isApplyingTheme = false;
  }
}

function getStylesConfigurationTarget(markdownConfiguration) {
  const inspectedStyles = markdownConfiguration.inspect("styles");

  if (inspectedStyles?.workspaceFolderValue !== undefined) {
    return vscode.ConfigurationTarget.WorkspaceFolder;
  }

  if (inspectedStyles?.workspaceValue !== undefined) {
    return vscode.ConfigurationTarget.Workspace;
  }

  return vscode.ConfigurationTarget.Global;
}

function getSelectedThemeConfigurationTarget(extensionConfiguration) {
  const inspectedTheme = extensionConfiguration.inspect(SELECTED_THEME_SETTING);

  if (inspectedTheme?.workspaceFolderValue !== undefined) {
    return vscode.ConfigurationTarget.WorkspaceFolder;
  }

  if (inspectedTheme?.workspaceValue !== undefined) {
    return vscode.ConfigurationTarget.Workspace;
  }

  return vscode.ConfigurationTarget.Global;
}

function getStylesAtTarget(markdownConfiguration, configurationTarget) {
  const inspectedStyles = markdownConfiguration.inspect("styles");

  if (configurationTarget === vscode.ConfigurationTarget.WorkspaceFolder) {
    return inspectedStyles?.workspaceFolderValue ?? [];
  }

  if (configurationTarget === vscode.ConfigurationTarget.Workspace) {
    return inspectedStyles?.workspaceValue ?? [];
  }

  return inspectedStyles?.globalValue ?? [];
}

function getConfigurationTargetLabel(configurationTarget) {
  if (configurationTarget === vscode.ConfigurationTarget.WorkspaceFolder) {
    return "workspace folder";
  }

  if (configurationTarget === vscode.ConfigurationTarget.Workspace) {
    return "workspace";
  }

  return "user";
}

async function refreshMarkdownPreview() {
  try {
    await vscode.commands.executeCommand("markdown.preview.refresh");
  } catch {
    // Markdown previews also reload when markdown.styles changes.
  }
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
  selectThemeWithLivePreview
};
