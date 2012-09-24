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
        var image1Loaded = false, image2Loaded = false,
            img1 = document.getElementById('file1'),
            img2 = document.getElementById('file2'),
            img1El = document.getElementById('image1'),
            img2El = document.getElementById('image2'),
            placeHolderImage = img1El.src;

        function enableComparison() {
            var button = document.getElementById('compare');
            if (image1Loaded && image2Loaded) {
                if (button.hasAttribute('disabled')) {
                    button.removeAttribute('disabled');
                }
            } else {
                if (!button.hasAttribute('disabled')) {
                    button.setAttribute('disabled', 'disabled');
                }
            }
        }

        img1.addEventListener('change', function (ev) {
            document.getElementById('result-container').removeAttribute('style');
            image1Loaded = false;
            if (img1.files.length) {
                readFiles(img1.files, function (img1File) {
                    if (/^image\//.test(img1File.type)) {
                        img1El.src = img1File.data;
                        image1Loaded = true;
                        enableComparison();
                    } else {
                        alert('Not an image file.');
                        img1.value = null;
                    }
                });
            } else {
                img1El.src = placeHolderImage;
                enableComparison();
            }
        });
        img2.addEventListener('change', function (ev) {
            document.getElementById('result-container').removeAttribute('style');
            image2Loaded = false;
            if (img2.files.length) {
                readFiles(img2.files, function (img2File) {
                    if (/^image\//.test(img2File.type)) {
                        img2El.src = img2File.data;
                        image2Loaded = true;
                        enableComparison();
                    } else {
                        alert('Not an image file.');
                        img2.value = null;
                    }
                });
            } else {
                img2El.src = placeHolderImage;
                enableComparison();
            }
        });
        document.getElementById('comparisonform').addEventListener('submit', function (ev) {
            var id, comparisonResult, percentage;
            ev.preventDefault();
            if (image1Loaded && image2Loaded) {
                id = new ImageDash(64, 10);
                comparisonResult = id.compareImages(img1El, img2El);
                percentage = ((1 - comparisonResult / 4) * 100).toFixed(2).toString();
                document.getElementById('result-container').setAttribute('style', 'display: block');
                document.getElementById('result').innerHTML = percentage + '%';
            } else {
                alert('Images not loaded.');
            }
        });
    });

}());