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
        var img1 = document.getElementById('file1'),
            img2 = document.getElementById('file2'),
            img1El = document.getElementById('image1'),
            img2El = document.getElementById('image2'),
            img1ChangeListener, img2ChangeListener,
            placeHolderImage = img1El.src;

        function enableComparison() {
            var button = document.getElementById('compare');
            if (img1El.loaded && img2El.loaded) {
                if (button.hasAttribute('disabled')) {
                    button.removeAttribute('disabled');
                }
            } else {
                if (!button.hasAttribute('disabled')) {
                    button.setAttribute('disabled', 'disabled');
                }
            }
        }
        
        function makeChangeListener(fileInput, imageElement) {
            return function () {
                document.getElementById('result-container').removeAttribute('style');
                imageElement.loaded = false;
                if (fileInput.files.length) {
                    readFiles(fileInput.files, function (imgFile) {
                        if (/^image\//.test(imgFile.type)) {
                            imageElement.src = imgFile.data;
                            imageElement.loaded = true;
                            enableComparison();
                        } else {
                            alert('Not an image file.');
                            fileInput.value = null;
                        }
                    });
                } else {
                    imageElement.src = placeHolderImage;
                    enableComparison();
                }
            };
        }
        img1ChangeListener = makeChangeListener(img1, img1El);
        img2ChangeListener = makeChangeListener(img2, img2El);
        img1.addEventListener('change', img1ChangeListener);
        img2.addEventListener('change', img2ChangeListener);
        img1ChangeListener();
        img2ChangeListener();
        document.getElementById('comparisonform').addEventListener('submit', function (ev) {
            var id, comparisonResult, percentage;
            ev.preventDefault();
            if (img1El.loaded && img2El.loaded) {
                id = new ImageDash(64, 10);
                comparisonResult = id.compareImages(img1El, img2El);
                percentage = (comparisonResult * 100).toFixed(2).toString();
                document.getElementById('result-container').setAttribute('style', 'display: block');
                document.getElementById('result').innerHTML = percentage + '%';
            } else {
                alert('Images not loaded.');
            }
        });
    });

}());
