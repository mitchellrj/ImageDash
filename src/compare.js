(function () {
    "use strict";

    function getLightness (pix) {
        var r = pix[0] / 255,
            g = pix[1] / 255,
            b = pix[2] / 255,
            min = Math.min(r, g, b),
            max = Math.max(r, g, b);

        return ( max + min ) / 2;
    }
    function colorScale(p, lightest, darkest) {
        var delta = lightest - darkest,
        mid = delta / 2 * 255,
        scale = 1 / delta;

        return (p - mid) * scale + 127;
    }

    var ImageDash = window.ImageDash = window.ImageDash ||
        function (sampleSize, histogramBuckets) {
        this.sampleSize = sampleSize===undefined ? 64 : sampleSize;
        this.histogramBuckets = histogramBuckets===undefined ? 10 : histogramBuckets;
    };

    ImageDash.prototype._getPixel = function (imgdata, x, y) {
        var i = (y * this.sampleSize + x) * 4;

        if (x < 0 || x > this.sampleSize || y < 0 || y > this.sampleSize) {
            return [0, 0, 0, 0];
        }
        return [imgdata[i], imgdata[i+1], imgdata[i+2], imgdata[i+3]];
    };
    ImageDash.prototype._bucket = function (c) {
        return Math.round(c * (this.histogramBuckets - 1) / 255);
    };

    ImageDash.prototype._normalizeColorHistogram = function (hist) {
        var imageSize = this.sampleSize * this.sampleSize;
        return hist.map(
            function(colour) {
                return colour.map(function (bucket) {
                    return bucket / imageSize;
                });
            });
    };

    ImageDash.prototype._getTextureHistogramFromData = function(imgdata) {
        // get edges using the Prewitt operator
        var i = 0, x, y, surrounding = [], hist = [], gradx, grady,
            theta, grad, totalEdgePoints = 0, maxGrad = 0, self = this;
        function bucket(angle) {
            angle = angle < 0 ? -angle : angle;
            return Math.round(angle * (self.histogramBuckets -1) / Math.PI);
        }
        for (i; i < imgdata.length; i += 4) {
            y = Math.floor(i / this.sampleSize / 4);
            x = i % (this.sampleSize * 4);
            surrounding.push(getLightness(this._getPixel(imgdata, x - 1, y - 1)));
            surrounding.push(getLightness(this._getPixel(imgdata, x, y - 1)));
            surrounding.push(getLightness(this._getPixel(imgdata, x + 1, y - 1)));
            surrounding.push(getLightness(this._getPixel(imgdata, x - 1, y)));
            surrounding.push(getLightness(this._getPixel(imgdata, x, y)));
            surrounding.push(getLightness(this._getPixel(imgdata, x + 1, y)));
            surrounding.push(getLightness(this._getPixel(imgdata, x - 1, y + 1)));
            surrounding.push(getLightness(this._getPixel(imgdata, x, y + 1)));
            surrounding.push(getLightness(this._getPixel(imgdata, x + 1, y + 1)));

            gradx = (surrounding[2] + surrounding[5] * 2 + surrounding[8]) -
                    (surrounding[0] + surrounding[3] * 2 + surrounding[6]);
            grady = (surrounding[0] + surrounding[1] * 2 + surrounding[2]) -
                    (surrounding[6] + surrounding[7] * 2 + surrounding[8]);

            grad = Math.sqrt(gradx * gradx + grady * grady);
            maxGrad = Math.max(maxGrad, grad);

            if (grad > 3.3) {
                totalEdgePoints += 1;
                theta = Math.atan2(grady, gradx);
                hist[bucket(theta)] = hist[bucket(theta)] || 0;
                hist[bucket(theta)] += 1;
            }
        }

        return hist.map(function (bucket) {
            return bucket / totalEdgePoints;
        });
    };

    ImageDash.prototype._getColorHistogramFromData = function(imgdata) {
        var i = 0, hist = [[], [], []];
        for (i; i < imgdata.length; i += 4) {
            hist[0][this._bucket(imgdata[i])] = hist[0][this._bucket(imgdata[i])] || 0;
            hist[0][this._bucket(imgdata[i])] += 1;
            hist[1][this._bucket(imgdata[i + 1])] = hist[1][this._bucket(imgdata[i + 1])] || 0;
            hist[1][this._bucket(imgdata[i + 1])] += 1;
            hist[2][this._bucket(imgdata[i + 2])] = hist[2][this._bucket(imgdata[i + 2])] || 0;
            hist[2][this._bucket(imgdata[i + 2])] += 1;
        }

        return this._normalizeColorHistogram(hist);
    };

    ImageDash.prototype._getScaledImageData = function(img, reorientate) {
        var canvas = document.createElement('canvas'),
            finalCanvas = document.createElement('canvas'),
            context = canvas.getContext('2d'),
            finalContext = finalCanvas.getContext('2d'),
            imageData, pix, lightest = 0, darkest = 1, r, c,
            lightness, sortedCorners = [], cornerValues = [],
            minEdge, edgeSums = [], i, rot = 0, tl, tr;

        canvas.height = canvas.width = finalCanvas.height = finalCanvas.width = this.sampleSize;
        // first, scale down to our sample size
        context.drawImage(img, 0, 0, img.width, img.height, 0, 0, this.sampleSize, this.sampleSize);

        // find the darkest and lightest colors
        imageData = context.getImageData(0, 0, this.sampleSize, this.sampleSize);
        pix = imageData.data;
        for (r=0; r < this.sampleSize; r+=1) {
            for (c = 0; c < this.sampleSize; c += 1 ) {
                i = r * this.sampleSize * 4 + c * 4;
                lightness = getLightness([pix[i], pix[i + 1], pix[i + 2]]);
                lightest = Math.max(lightest, lightness);
                darkest = Math.min(darkest, lightness);
            }
        }

        // transform colors so darkest color is black & lightest is white
        // also get darkest & lightest corners
        for (r=0; r < this.sampleSize; r+=1) {
            for (c = 0; c < this.sampleSize; c +=1 ) {
                i = r * this.sampleSize * 4 + c * 4;
                pix[i] = colorScale(pix[i], lightest, darkest);
                pix[i + 1] = colorScale(pix[i + 1], lightest, darkest);
                pix[i + 2] = colorScale(pix[i + 2], lightest, darkest);
                if ((r % (this.sampleSize - 1)===0) && (c % (this.sampleSize - 1)===0)) {
                    lightness = getLightness([pix[i], pix[i + 1], pix[i + 2]]);
                    cornerValues[(!!r << 1) | !!c] = lightness;
                }
            }
        }
        context.putImageData(imageData, 0, 0);
        finalContext.save();

        if (reorientate) {
            sortedCorners = cornerValues.slice(0).sort();
            for (i = 0; i < 4; i += 1) {
                cornerValues[i] = 3 - sortedCorners.indexOf(cornerValues[i]);
            }

            // rotate and flip so lightest is in top left, next lightest in top right.
            edgeSums = [
                cornerValues[0] + cornerValues[1],
                cornerValues[2] + cornerValues[0],
                cornerValues[2] + cornerValues[3],
                cornerValues[1] + cornerValues[3]
                ];

            minEdge = Math.min.apply(this, edgeSums);
            rot = edgeSums.indexOf(minEdge);

            switch (rot) {
            case 1:
                tl = 2;
                tr = 0;
                break;
            case 2:
                tl = 3;
                tr = 2;
                break;
            case 3:
                tl = 1;
                tr = 3;
                break;
            case 0:
            default:
                tl = 0;
                tr = 1;
                break;
            }
            if (cornerValues[tl] < cornerValues[tr]) {
                finalContext.translate(this.sampleSize, 0);
                finalContext.scale(-1, 1);
            }
            finalContext.translate(canvas.width / 2, canvas.height / 2);
            finalContext.rotate(rot * 0.5 * Math.PI);
            finalContext.translate(-canvas.width / 2, -canvas.height / 2);
        }
        finalContext.drawImage(canvas, 0, 0, this.sampleSize, this.sampleSize, 0, 0, this.sampleSize, this.sampleSize);
        finalContext.restore();
        return finalContext.getImageData(0, 0, this.sampleSize, this.sampleSize).data;
    };

    ImageDash.prototype.getHistogram = function (img, reorientate) {
        var imageData = this._getScaledImageData(img, reorientate),
            histograms = [];

        histograms = this._getColorHistogramFromData(imageData);
        histograms.push(this._getTextureHistogramFromData(imageData));
        return histograms;
    };

    ImageDash.prototype.compareHistograms = function(hist1, hist2) {
        // Use L2 distances
        var c, b, result = 0;
        for (c = 0; c < hist1.length; c += 1) {
            for (b = 0; b < this.histogramBuckets; b += 1) {
                result += Math.pow((hist1[c][b] || 0) - (hist2[c][b] || 0), 2);
            }
        }
        return Math.sqrt(result / this.histogramBuckets / 4);
    };

    ImageDash.prototype.compareImages = function (img1, img2, reorientate) {
        var hist1 = this.getHistogram(img1, reorientate),
            hist2 = this.getHistogram(img2, reorientate);

        return this.compareHistograms(hist1, hist2);
    };

}());
