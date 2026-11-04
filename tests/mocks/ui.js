export const responses=[];export const forms=[];
export class ActionFormData {constructor(){this.data={buttons:[]};}title(s){this.data.title=s;return this;}body(s){this.data.body=s;return this;}button(s){this.data.buttons.push(s);return this;}async show(){forms.push(this.data);return responses.shift()??{canceled:true};}}
export class ModalFormData extends ActionFormData {dropdown(){return this;}textField(){return this;}toggle(){return this;}}
