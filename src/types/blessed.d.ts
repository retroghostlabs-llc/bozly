/**
 * Type declaration for blessed module
 * Provides minimal TypeScript support for blessed TUI library
 */

declare module "blessed" {
  export = blessed;

  namespace blessed {
    function screen(options?: any): Widgets.Screen;
    function box(options?: any): Widgets.BoxElement;
    function list(options?: any): Widgets.ListElement;
    function button(options?: any): Widgets.ButtonElement;
    function textbox(options?: any): Widgets.TextboxElement;

    namespace Widgets {
      interface Screen {
        box(options?: any): BoxElement;
        list(options?: any): ListElement;
        button(options?: any): ButtonElement;
        textbox(options?: any): TextboxElement;
        render(): void;
        key(keys: string[], callback: () => void): void;
        on(event: string, callback: (...args: any[]) => void): void;
        removeListener(event: string, callback: (...args: any[]) => void): void;
        destroy(): void;
        focus(): void;
        [key: string]: any;
      }

      interface BoxElement {
        setContent(content: string): void;
        getContent(): string;
        render(): void;
        key(keys: string[], callback: () => void): void;
        on(event: string, callback: (...args: any[]) => void): void;
        removeListener(event: string, callback: (...args: any[]) => void): void;
        destroy(): void;
        focus(): void;
        blur(): void;
        [key: string]: any;
      }

      interface ListElement {
        addItem(text: string): void;
        addItems(items: string[]): void;
        removeItem(index: number): void;
        clearItems(): void;
        selectItem(index: number): void;
        select(index: number): void;
        getSelected(): number;
        render(): void;
        key(keys: string[], callback: () => void): void;
        on(event: string, callback: (...args: any[]) => void): void;
        removeListener(event: string, callback: (...args: any[]) => void): void;
        destroy(): void;
        focus(): void;
        blur(): void;
        [key: string]: any;
      }

      interface ButtonElement {
        [key: string]: any;
      }

      interface TextboxElement {
        [key: string]: any;
      }

      interface BoxOptions {
        [key: string]: any;
      }

      interface ListOptions {
        [key: string]: any;
      }

      interface ButtonOptions {
        [key: string]: any;
      }

      interface TextboxOptions {
        [key: string]: any;
      }
    }
  }
}
