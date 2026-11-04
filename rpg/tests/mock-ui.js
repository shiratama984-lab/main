export const responses = [], forms = [];
export class ActionFormData {
    constructor() { this.data = { buttons: [] }; }
    title(s) { this.data.title = s; return this; }
    body(s) { this.data.body = s; return this; }
    button(text, icon) { this.data.buttons.push({ text, icon }); return this; }
    async show() { forms.push(this.data); return responses.shift() ?? { canceled: true }; }
}
export class ModalFormData extends ActionFormData {
    dropdown() { return this; }
    textField() { return this; }
    toggle() { return this; }
}
export class MessageFormData extends ActionFormData {
    button1(s) { return this.button(s); }
    button2(s) { return this.button(s); }
}
