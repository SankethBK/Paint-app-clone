class Point {
    constructor(x , y){
        this.x = x;
        this.y = y;
        return this;
    }
}



class Paint {

    constructor(canvasId){
        this.canvas = document.getElementById(canvasId);
        this.context = this.canvas.getContext("2d");
        this.undoStack = [];
        this.undoLimit = 3;
    }

    set activeTool(tool){
        this.tool = tool;
    }

    set lineWidth(linewidth){
        this._lineWidth = linewidth;
        this.context.lineWidth = this._lineWidth;
    }

    set brushSize(brushsize){
        this._brushSize = brushsize;
    }

    set selectedColor(color){
        this.color = color;
        this.context.strokeStyle = this.color;
    }

    init(){
        this.canvas.onmousedown = e => this.onMouseDown(e);
    }

    onMouseDown(e){
        

        this.savedData = this.context.getImageData(0 , 0 , this.canvas.clientWidth , this.canvas.clientHeight);
        this.canvas.onmousemove = e => this.onMouseMove(e);
        document.onmouseup = e => this.onMouseUp(e);

        if (this.undoStack.length > 3){
            this.undoStack.shift();
        }
        this.undoStack.push(this.savedData);

        this.startPos = getMouseCoordsOnCanvas(e , this.canvas);
        
        if (this.tool == TOOL_PENCIL || this.tool == TOOL_BRUSH){
            this.context.beginPath();
            this.context.moveTo(this.startPos.x , this.startPos.y);
        }

        else if (this.tool == TOOL_PAINT_BUCKET){
            new Fill(this.canvas , this.startPos , this.color);
        }
        else if (this.tool == TOOL_ERASER){
            this.context.clearRect(this.startPos.x , this.startPos.y , this._brushSize , this._brushSize);
        }

    }

    onMouseMove(e){

        this.currentPos = getMouseCoordsOnCanvas(e , canvas);
        
        switch (this.tool){
            case TOOL_LINE:
            case TOOL_RECTANGLE:
            case TOOL_CIRCLE:
            case TOOL_TRIANGLE:
                this.drawShape();
                break;
            case TOOL_PENCIL:
                this.drawFreeLine(this._lineWidth);
                break;
            case TOOL_BRUSH:
                this.drawFreeLine(this._brushSize);
                break;
            case TOOL_ERASER:
                this.context.clearRect(this.currentPos.x , this.currentPos.y , this._brushSize , this._brushSize);
                break;
            default:
                break;
        }
    }

    drawShape(){
        
        this.context.putImageData(this.savedData, 0 , 0);

        this.context.beginPath();

        if (this.tool == TOOL_LINE) {
            this.context.moveTo(this.startPos.x , this.startPos.y);
            this.context.lineTo(this.currentPos.x , this.currentPos.y);
        }
        else if (this.tool == TOOL_RECTANGLE){
            this.context.rect(this.startPos.x , this.startPos.y , this.currentPos.x - this.startPos.x , this.currentPos.y - this.startPos.y);
        }
        else if (this.tool == TOOL_CIRCLE){
            let distance = Math.sqrt(Math.pow((this.startPos.x - this.currentPos.x),2) + Math.pow((this.startPos.y - this.currentPos.y),2))
            this.context.arc(this.startPos.x , this.startPos.y , distance , 0 , Math.PI * 2 , false);
        }
        else if (this.tool == TOOL_TRIANGLE){
            this.context.moveTo(this.startPos.x + (this.currentPos.x - this.startPos.x)/2 , this.startPos.y);
            this.context.lineTo(this.startPos.x , this.currentPos.y);
            this.context.lineTo(this.currentPos.x, this.currentPos.y);
            this.context.closePath();
        }

        this.context.stroke();
    }

    drawFreeLine(lineWidth){
        this.context.lineWidth = lineWidth;     
        this.context.lineTo(this.currentPos.x , this.currentPos.y);
        this.context.stroke();
    }

    onMouseUp(e){
        this.canvas.onmousemove = null;
        document.onmouseup = null;
    }

    undoPaint(){
        if (this.undoStack.length > 0){
            this.context.putImageData(this.undoStack[this.undoStack.length - 1],0,0);
            this.undoStack.pop();
        }
        else{
            alert("no undo's availible");
        }
    }
}

class Fill {
    constructor(canvas , point , color){
        this.context = canvas.getContext("2d");

        this.imageData = this.context.getImageData(0, 0, this.context.canvas.width , this.context.canvas.height);
        const targetColor = this.getPixel(point);
        const fillColor = this.hexToRgb(color);
        this.fillStack = [];
        this.floodFill(point, targetColor , fillColor);
        this.fillColor();
    }

    floodFill(point, targetColor, fillColor){
        if (this.colorSnatch(targetColor , fillColor)){
            return;
        }

        const currentColor = this.getPixel(point);

        if (this.colorSnatch(currentColor , targetColor)){
            this.setPixel(point , fillColor);

            this.fillStack.push([new Point(point.x + 1, point.y) , targetColor , fillColor]);
            this.fillStack.push([new Point(point.x - 1, point.y) , targetColor , fillColor]);
            this.fillStack.push([new Point(point.x , point.y + 1) , targetColor , fillColor]);
            this.fillStack.push([new Point(point.x , point.y - 1) , targetColor , fillColor]);
        }
    }

    fillColor(){

        if (this.fillStack.length){
            let range = this.fillStack.length;

            for (let i = 0; i < range; i++){
                this.floodFill(this.fillStack[i][0], this.fillStack[i][1], this.fillStack[i][2]);
            }

            this.fillStack.splice(0, range);

            this.fillColor();
        }
        else{
            this.context.putImageData(this.imageData, 0, 0);
            this.fillStack = [];
        }
    }

    getPixel(point){
        if (point.x < 0 || point.y < 0 || point.x >= this.imageData.width || point.y >= this.imageData.height){
            return [-1, -1, -1, -1];
        }

        else{
            const offset = (point.y * this.imageData.width + point.x) * 4;

            return [
                this.imageData.data[offset + 0],
                this.imageData.data[offset + 1],
                this.imageData.data[offset + 2],
                this.imageData.data[offset + 3]
            ]
        }
    }

    setPixel(point , fillColor){
        const offset = (point.y * this.imageData.width + point.x) * 4;

        this.imageData.data[offset + 0] = fillColor[0];
        this.imageData.data[offset + 1] = fillColor[1];
        this.imageData.data[offset + 2] = fillColor[2];
        this.imageData.data[offset + 3] = fillColor[3];

    }

     hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
           parseInt(result[1], 16),
           parseInt(result[2], 16),
           parseInt(result[3], 16),
           255
         ] : null;
      }

    colorSnatch(color1, color2){
        return color1[0] === color2[0] && color1[1] === color2[1] && color1[2] === color2[2] && color1[3] === color2[3];
    }
}

function getMouseCoordsOnCanvas(e, canvas){
    let rect = canvas.getBoundingClientRect();
    let x = Math.round(e.clientX - rect.left);
    let y = Math.round(e.clientY - rect.top);
    return new Point(x , y);
}


const TOOL_LINE = "line";
const TOOL_RECTANGLE = "rectangle";
const TOOL_CIRCLE = "circle";
const TOOL_TRIANGLE = "triangle";
const TOOL_PAINT_BUCKET = "paint-bucket";
const TOOL_PENCIL = "pencil";
const TOOL_BRUSH = "brush";
const TOOL_ERASER = "eraser";

var paint = new Paint("canvas");
paint.activeTool = TOOL_LINE;
paint.lineWidth = 1;
paint.brushSize = 4;
paint.selectedColor = "#000000";
paint.init();

document.querySelectorAll("[data-command]").forEach(
    item => {
        item.addEventListener("click", e => {
            let command = item.getAttribute("data-command");

            if (command === "undo"){
                paint.undoPaint();
            }
            else if (command == "download"){
                var canvas = document.getElementById("canvas");
                var image = canvas.toDataURL('image/png' , 1.0).replace('image/png' , 'image/octet-stream');
                var link = document.createElement("a");
                link.download = "my-image-png";
                link.href = image;
                link.click();
            }
        });
    }
);

document.querySelectorAll("[data-tool]").forEach(
    item => {
        item.addEventListener("click", e => {
            document.querySelector("[data-tool].active").classList.toggle("active");
            item.classList.toggle("active");
       

            let selectedTool = item.getAttribute("data-tool");
            paint.activeTool = selectedTool;

            switch(selectedTool){
                case TOOL_LINE:
                case TOOL_RECTANGLE:
                case TOOL_CIRCLE:
                case TOOL_TRIANGLE:
                case TOOL_PENCIL:
                    // activate shape linewidths group 
                    document.querySelector(".group.for-shapes").style.display = "block";
                    // invisible brush linewidths group
                    document.querySelector(".group.for-brush").style.display = "none";
                    break;
                case TOOL_BRUSH:
                case TOOL_ERASER:
                    // activate brush linewidths group
                    document.querySelector(".group.for-brush").style.display = "block";
                    // invisible shape linewidths group
                    document.querySelector(".group.for-shapes").style.display = "none";
                    break;
                default:
                    // make invisible both linewidths group
                    document.querySelector(".group.for-brush").style.display = "none";
                    document.querySelector(".group.for-shapes").style.display = "none";
            }
        });
    }
);

document.querySelectorAll("[data-line-width]").forEach(
    item => {
        item.addEventListener("click", e => {
            document.querySelector("[data-line-width].active").classList.toggle("active");
            item.classList.toggle("active");
            
            let linewidth = item.getAttribute("data-line-width");
            paint.lineWidth = linewidth;
        });
    }
);

document.querySelectorAll("[data-brush-width]").forEach(
    item => {
        item.addEventListener("click", e => {
            document.querySelector("[data-brush-width].active").classList.toggle("active");
            item.classList.toggle("active");
            
            let brushsize = item.getAttribute("data-brush-width");
            paint.brushSize = brushsize;
        });
    }
);

document.querySelectorAll("[data-color]").forEach(
    item => {
        item.addEventListener("click", e => {
            document.querySelector("[data-color].active").classList.toggle("active");
            item.classList.toggle("active");

            let color = item.getAttribute("data-color");
            paint.selectedColor = color;

        });
    }
);