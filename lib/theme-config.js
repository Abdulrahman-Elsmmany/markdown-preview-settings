const DEFAULT_THEME_ID = "vera";

const THEME_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "vera",
    label: "Vera",
    description: "Midnight neon with soft gradients and terminal-style code blocks."
  }),
  Object.freeze({
    id: "linen",
    label: "Linen",
    stylesheet: "themes/linen.css",
    description: "Low-glare midnight editorial for long-form reading."
  }),
  Object.freeze({
    id: "terminal",
    label: "Terminal",
    stylesheet: "themes/terminal.css",
    description: "Monochrome CRT console with amber system accents."
  }),
  Object.freeze({
    id: "blueprint",
    label: "Blueprint",
    stylesheet: "themes/blueprint.css",
    description: "Technical drawing board with precise drafting lines."
  }),
  Object.freeze({
    id: "bauhaus",
    label: "Bauhaus",
    stylesheet: "themes/bauhaus.css",
    description: "Dark modernist poster with primary-color geometry."
  }),
  Object.freeze({
    id: "nocturne",
    label: "Nocturne",
    stylesheet: "themes/nocturne.css",
    description: "Black-tie editorial with brass, oxblood, and velvet depth."
  }),
  Object.freeze({
    id: "forest",
    label: "Forest",
    stylesheet: "themes/forest.css",
    description: "Rain-soaked evergreen study with moss and firefly accents."
  }),
  Object.freeze({
    id: "graphite",
    label: "Graphite",
    stylesheet: "themes/graphite.css",
    description: "Restrained monochrome focus mode with crisp editorial rhythm."
  }),
  Object.freeze({
    id: "synthwave",
    label: "Synthwave",
    stylesheet: "themes/synthwave.css",
    description: "Neon horizon, arcade glow, and retro-future grid energy."
  }),
  Object.freeze({
    id: "ember",
    label: "Ember",
    stylesheet: "themes/ember.css",
    description: "Industrial charcoal workshop with copper and heat accents."
  }),
  Object.freeze({
    id: "abyss",
    label: "Abyss",
    stylesheet: "themes/abyss.css",
    description: "Deep-ocean calm with bioluminescent cyan and cobalt depth."
  }),
  Object.freeze({
    id: "rosewood",
    label: "Rosewood",
    stylesheet: "themes/rosewood.css",
    description: "Plum library, rose ink, and warm mahogany reading room."
  }),
  Object.freeze({
    id: "cathedral",
    label: "Cathedral",
    stylesheet: "themes/cathedral.css",
    description: "Midnight stone, stained glass, and jewel-toned geometry."
  }),
  Object.freeze({
    id: "aurora",
    label: "Aurora",
    stylesheet: "themes/aurora.css",
    description: "Polar night with soft northern-light ribbons and ice accents."
  }),
  Object.freeze({
    id: "inkstone",
    label: "Inkstone",
    stylesheet: "themes/inkstone.css",
    description: "Sumi-black study with vermilion seals and quiet paper grain."
  })
]);

const MANAGED_THEME_PATHS = new Set(
  THEME_DEFINITIONS.filter((theme) => theme.stylesheet).map((theme) =>
    normalizeStylesheet(theme.stylesheet)
  )
);

function getTheme(themeId) {
  return THEME_DEFINITIONS.find((theme) => theme.id === themeId);
}

function replaceManagedStylesheet(styles, nextStylesheet, previousStylesheet) {
  const preservedStyles = (Array.isArray(styles) ? styles : []).filter(
    (stylesheet) => !isManagedStylesheet(stylesheet, previousStylesheet)
  );

  if (
    nextStylesheet &&
    !preservedStyles.some(
      (stylesheet) => normalizeStylesheet(stylesheet) === normalizeStylesheet(nextStylesheet)
    )
  ) {
    preservedStyles.push(nextStylesheet);
  }

  return preservedStyles;
}

function isManagedStylesheet(stylesheet, previousStylesheet) {
  const normalizedStylesheet = normalizeStylesheet(stylesheet);
  const normalizedPreviousStylesheet = normalizeStylesheet(previousStylesheet);

  if (!normalizedStylesheet) {
    return false;
  }

  if (normalizedPreviousStylesheet && normalizedStylesheet === normalizedPreviousStylesheet) {
    return true;
  }

  if (!normalizedStylesheet.includes("/abdulrahman-elsmmany.markdown-preview-themes-")) {
    return false;
  }

  for (const themePath of MANAGED_THEME_PATHS) {
    if (normalizedStylesheet.endsWith(`/${themePath}`)) {
      return true;
    }
  }

  return false;
}

function normalizeStylesheet(stylesheet) {
  return typeof stylesheet === "string" ? stylesheet.replaceAll("\\", "/").toLowerCase() : "";
}

module.exports = {
  DEFAULT_THEME_ID,
  THEME_DEFINITIONS,
  getTheme,
  isManagedStylesheet,
  normalizeStylesheet,
  replaceManagedStylesheet
};
