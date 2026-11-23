let nextObjectId = 0;

export class GameObject {
  static selector = "";
  static definition = {};

  constructor(element) {
    if (!(element instanceof Element)) {
      throw new TypeError(`${this.constructor.name} requires a DOM element.`);
    }

    this.element = element;
    this.definition = {
      themes: {},
      skins: { default: { css: "" } },
      ...this.constructor.definition
    };
    this.id = `${this.definition.type}-${++nextObjectId}`;
    this.element.dataset.objectId = this.id;
    this.element.dataset.objectType = this.definition.type;

    if (this.definition.hoverText) {
      this.element.dataset.label = this.definition.hoverText;
    }
    if (this.definition.hoverAnimation) {
      this.element.dataset.hoverAnimation = this.definition.hoverAnimation;
    }

    this.styleElement = document.createElement("style");
    this.styleElement.dataset.objectStyles = this.id;
    document.head.appendChild(this.styleElement);

    this.setTheme(document.documentElement.dataset.theme || "comic");
    this.applySkin(this.element.dataset.skin || this.definition.defaultSkin || "default");
  }

  setTheme(theme) {
    this.theme = theme;
    this.element.dataset.objectTheme = theme;
    this.renderStyles();
    return this;
  }

  applySkin(name) {
    const skin = this.definition.skins[name] || this.definition.skins.default;
    if (!skin) return this;
    this.skin = this.definition.skins[name] ? name : "default";
    this.element.dataset.skin = this.skin;
    this.renderStyles();
    return this;
  }

  renderStyles() {
    const selector = `html [data-object-id="${this.id}"]`;
    const snippets = [
      this.definition.styles,
      this.definition.hover && this.definition.hover.css,
      this.definition.themes[this.theme],
      this.definition.skins[this.skin] && this.definition.skins[this.skin].css
    ];

    this.styleElement.textContent = snippets
      .filter(Boolean)
      .map((css) => css.split("$root").join(selector))
      .join("\n");
  }
}
