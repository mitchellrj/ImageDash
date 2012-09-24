(function() {
    "use strict";

    function readFiles(files, callback) {
        var reader = new FileReader(),
            fileArray = [],
            i;

        if (files.length !== 1) {
            return false;
        }
        for (i = 0; i < files.length; i += 1) {
            fileArray.push(files[i]);
        }

        function doRead(fileArray) {
            reader.addEventListener('loadend', function (ev) {
                var file = {
                        name: fileArray[0].name,
                        size: fileArray[0].size,
                        type: fileArray[0].type,
                        data: reader.result
                    };
                callback(file);
                fileArray.shift();
                if (fileArray.length) {
                    doRead(fileArray);
                }
            });
            reader.readAsDataURL(fileArray[0]);
        }

        doRead(fileArray);
    }

    window.addEventListener('load', function (ev) {
        document.getElementById('comparisonform').addEventListener('submit', function (ev) {
            ev.preventDefault();
            var img1 = document.getElementById('file1');
            readFiles(img1.files, function (img1File) {
                // first image read, display
                var img2 = document.getElementById('file2'),
                    img1El = new Image(),
                    dataUrl = img1File.data;
                img1El.onload = function () {
                    // first image loaded, start loading second image
                    readFiles(img2.files, function (img2File) {
                        // second image read, display
                        var img2El = new Image(),
                            dataUrl = img2File.data,
                            id = new ImageDash(64, 10);
                        img2El.onload = function () {
                            // second image loaded, compare images
                            var comparisonResult = id.compareImages(img1El, img2El);
                            document.getElementById('result').innerHTML = ((1 - comparisonResult / 4) * 100).toString() + '%';
                        };
                        img2El.src = dataUrl;
                        document.getElementById('file2-field').appendChild(img2El);
                    });
                };
                img1El.src = dataUrl;
                document.getElementById('file1-field').appendChild(img1El);
            });
        });
    });

}());