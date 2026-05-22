import ReactDOM from "react-dom/client";
import Palette from "../../components/Palette";
import { TAB_PALETTE_ELEMENT } from "../../utils/constants";
import { applyTheme, subscribeTheme } from "../../utils/theme";

export default defineContentScript({
  matches: ["*://*/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: TAB_PALETTE_ELEMENT,
      position: "inline",
      anchor: "body",
      append: "first",
      onMount: (container) => {
        const wrapper = document.createElement("div");
        container.append(wrapper);

        const unsubscribe = subscribeTheme((resolved) => applyTheme(wrapper, resolved));

        const root = ReactDOM.createRoot(wrapper);
        root.render(<Palette />);

        return { root, wrapper, cleanup: unsubscribe };
      },
      onRemove: (elements) => {
        elements?.cleanup?.();
        elements?.root.unmount();
        elements?.wrapper.remove();
      },
    });

    ui.mount();
  },
});
