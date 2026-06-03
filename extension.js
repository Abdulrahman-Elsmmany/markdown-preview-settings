const vscode = require("vscode");
const {
  DEFAULT_PAGE_LAYOUT_ID,
  DEFAULT_THEME_ID,
  PAGE_LAYOUT_DEFINITIONS,
  THEME_DEFINITIONS,
  getPageLayout,
  getTheme,
  replaceManagedLayoutStylesheet,
  replaceManagedThemeStylesheet
} = require("./lib/theme-config");

const MANAGED_THEME_STYLESHEET_STATE_KEY = "markdownPreviewThemes.managedStylesheet";
const MANAGED_LAYOUT_STYLESHEET_STATE_KEY = "markdownPreviewThemes.managedLayoutStylesheet";
const PAGE_LAYOUT_SETTING = "pageLayout";
const SELECTED_THEME_SETTING = "selectedTheme";

let isApplyingPreviewConfiguration = false;

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("markdownPreviewThemes.selectTheme", async () => {
      await selectThemeWithLivePreview(context);
    }),
    vscode.commands.registerCommand("markdownPreviewThemes.selectPageLayout", async () => {
      await selectPageLayout(context);
    }),
    vscode.commands.registerCommand("markdownPreviewThemes.resetTheme", async () => {
      await applyTheme(context, DEFAULT_THEME_ID, { showConfirmation: true });
    }),
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (
        isApplyingPreviewConfiguration ||
        (!event.affectsConfiguration("markdownPreviewThemes.selectedTheme") &&
          !event.affectsConfiguration("markdownPreviewThemes.pageLayout"))
      ) {
        return;
      }

      await applyConfiguredPreview(context, { showConfirmation: false });
    })
  );

  void syncConfiguredPreview(context);
}

async function syncConfiguredPreview(context) {
  const { pageLayoutId, themeId } = getConfiguredPreview();
  const previousThemeStylesheet = context.globalState.get(MANAGED_THEME_STYLESHEET_STATE_KEY);
  const previousLayoutStylesheet = context.globalState.get(MANAGED_LAYOUT_STYLESHEET_STATE_KEY);

  if (
    themeId !== DEFAULT_THEME_ID ||
    pageLayoutId !== DEFAULT_PAGE_LAYOUT_ID ||
    previousThemeStylesheet ||
    previousLayoutStylesheet
  ) {
    await applyConfiguredPreview(context, { showConfirmation: false });
  }
}

async function applyConfiguredPreview(context, options = {}) {
  await applyPreviewConfiguration(context, getConfiguredPreview(), options);
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

async function selectPageLayout(context) {
  const { pageLayoutId: initialPageLayoutId, themeId } = getConfiguredPreview();
  const items = PAGE_LAYOUT_DEFINITIONS.map((pageLayout) => ({
    label: pageLayout.label,
    description: pageLayout.id === initialPageLayoutId ? "Current" : undefined,
    detail: pageLayout.description,
    pageLayoutId: pageLayout.id
  }));
  const selectedPageLayout = await vscode.window.showQuickPick(items, {
    matchOnDescription: true,
    matchOnDetail: true,
    placeHolder: "Choose how wide the Markdown preview page should be.",
    title: "Markdown Preview Page Layout"
  });

  if (!selectedPageLayout) {
    return;
  }

  await applyPreviewConfiguration(
    context,
    {
      pageLayoutId: selectedPageLayout.pageLayoutId,
      themeId
    },
    { showConfirmation: true }
  );
}

async function applyTheme(context, themeId, options = {}) {
  await applyPreviewConfiguration(
    context,
    {
      pageLayoutId: getConfiguredPageLayoutId(),
      themeId
    },
    options
  );
}

async function applyPreviewConfiguration(context, previewConfiguration, options = {}) {
  const theme = getTheme(previewConfiguration.themeId);
  const pageLayout = getPageLayout(previewConfiguration.pageLayoutId);
  const persistManagedStylesheet = options.persistManagedStylesheet ?? true;
  const persistSelection = options.persistSelection ?? true;

  if (!theme) {
    void vscode.window.showErrorMessage(
      `Unknown Markdown preview theme: ${previewConfiguration.themeId}`
    );
    return;
  }

  if (!pageLayout) {
    void vscode.window.showErrorMessage(
      `Unknown Markdown preview page layout: ${previewConfiguration.pageLayoutId}`
    );
    return;
  }

  isApplyingPreviewConfiguration = true;

  try {
    const resource = vscode.window.activeTextEditor?.document.uri;
    const markdownConfiguration = vscode.workspace.getConfiguration("markdown", resource);
    const configurationTarget = getStylesConfigurationTarget(markdownConfiguration);
    const styles = getStylesAtTarget(markdownConfiguration, configurationTarget);
    const previousThemeStylesheet = context.globalState.get(MANAGED_THEME_STYLESHEET_STATE_KEY);
    const previousLayoutStylesheet = context.globalState.get(MANAGED_LAYOUT_STYLESHEET_STATE_KEY);
    const nextThemeStylesheet = getExtensionStylesheetPath(context, theme);
    const nextLayoutStylesheet = getExtensionStylesheetPath(context, pageLayout);
    const updatedStyles = replaceManagedLayoutStylesheet(
      replaceManagedThemeStylesheet(styles, nextThemeStylesheet, previousThemeStylesheet),
      nextLayoutStylesheet,
      previousLayoutStylesheet
    );

    if (!arraysEqual(styles, updatedStyles)) {
      await markdownConfiguration.update("styles", updatedStyles, configurationTarget);
    }

    if (persistManagedStylesheet) {
      await context.globalState.update(MANAGED_THEME_STYLESHEET_STATE_KEY, nextThemeStylesheet);
      await context.globalState.update(MANAGED_LAYOUT_STYLESHEET_STATE_KEY, nextLayoutStylesheet);
    }

    if (persistSelection) {
      const extensionConfiguration = vscode.workspace.getConfiguration("markdownPreviewThemes");
      if (extensionConfiguration.get(SELECTED_THEME_SETTING) !== theme.id) {
        await extensionConfiguration.update(
          SELECTED_THEME_SETTING,
          theme.id,
          getExtensionConfigurationTarget(extensionConfiguration, SELECTED_THEME_SETTING)
        );
      }

      if (extensionConfiguration.get(PAGE_LAYOUT_SETTING) !== pageLayout.id) {
        await extensionConfiguration.update(
          PAGE_LAYOUT_SETTING,
          pageLayout.id,
          getExtensionConfigurationTarget(extensionConfiguration, PAGE_LAYOUT_SETTING)
        );
      }
    }

    await refreshMarkdownPreview();

    if (options.showConfirmation) {
      const scope = getConfigurationTargetLabel(configurationTarget);
      void vscode.window.showInformationMessage(
        `Markdown preview: ${theme.label} theme, ${pageLayout.label} layout. Applied to ${scope} settings.`
      );
    }
  } finally {
    isApplyingPreviewConfiguration = false;
  }
}

function getConfiguredPreview() {
  return {
    pageLayoutId: getConfiguredPageLayoutId(),
    themeId: vscode.workspace
      .getConfiguration("markdownPreviewThemes")
      .get(SELECTED_THEME_SETTING, DEFAULT_THEME_ID)
  };
}

function getConfiguredPageLayoutId() {
  return vscode.workspace
    .getConfiguration("markdownPreviewThemes")
    .get(PAGE_LAYOUT_SETTING, DEFAULT_PAGE_LAYOUT_ID);
}

function getExtensionStylesheetPath(context, definition) {
  return definition.stylesheet
    ? vscode.Uri.joinPath(context.extensionUri, ...definition.stylesheet.split("/")).fsPath
    : undefined;
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

function getExtensionConfigurationTarget(extensionConfiguration, settingName) {
  const inspectedSetting = extensionConfiguration.inspect(settingName);

  if (inspectedSetting?.workspaceFolderValue !== undefined) {
    return vscode.ConfigurationTarget.WorkspaceFolder;
  }

  if (inspectedSetting?.workspaceValue !== undefined) {
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
  selectPageLayout,
  selectThemeWithLivePreview
};
