Dropzone.autoDiscover = false;

function init() {
  let dz = new Dropzone("#dropzone", {
    url: "/",
    maxFiles: 1,
    addRemoveLinks: true,
    dictDefaultMessage: "Some Message",
    autoProcessQueue: false,
  });

  dz.on("addedfile", function () {
    if (dz.files[1] != null) {
      dz.removeFile(dz.files[0]);
    }
  });

  dz.on("complete", function (file) {
    let imageData = file.dataURL;

    var url = "http://127.0.0.1:5000/classify_image";
   // var url = "/api/classify_image";

    $.post(url, {
      image_data: imageData,
    }, function (data, status) {
      if (!data || data.length === 0) {
        $("#error").show();
        $("#divClassTable").hide();
        $("#resultHolder").hide(); // Hide result holder if data is empty
        return;
      }

      $("#error").hide();
      $("#divClassTable").show();
      $("#resultHolder").show(); // Show result holder if there is data

      displayImageInResultHolder(imageData); // Display the uploaded image

      let match = null;
      let bestScore = -1;
      let bestClassName = '';

      for (let i = 0; i < data.length; ++i) {
        let maxScoreForThisClass = Math.max(...data[i].class_probability);

        if (maxScoreForThisClass > bestScore) {
          match = data[i];
          bestScore = maxScoreForThisClass;
        }
      }

      if (match) {
        // Mapping the indexes to the class names
        const classNames = ["Severely Drunk", "Slightly Drunk", "Sober"];

        let classDictionary = match.class_dictionary;

        // Find the class name with the best score
        for (let personName in classDictionary) {
          let index = classDictionary[personName];
          let probabilityScore = match.class_probability[index];
          if (probabilityScore === bestScore) {
            bestClassName = classNames[index];
            break;
          }
        }

        // Clear and update the class table to show only the highest score
        let classTable = $("#classTable");
        classTable.empty();

        classTable.append(`
          <tr>
            <th>Prediction</th>
            <th>Probability Score</th>
          </tr>
          <tr>
            <td>${bestClassName}</td>
            <td>${bestScore}</td>
          </tr>
          <tr>
            <td>Recommendation</td>
            <td id="recommendation"></td>
          </tr>
        `);

        // Classification recommendation based on your criteria
        if ((bestClassName === "Slightly Drunk" || bestClassName === "Severely Drunk") && bestScore > 50) {
          $("#recommendation").html("Driver is intoxicated. Driving is not recommended.");
        } else if (bestClassName === "Sober" && bestScore > 50) {
          $("#recommendation").html("Driver is sober. It is safe to drive.");
        } else {
          $("#recommendation").html("No clear recommendation. Try recapturing the image");
        }
      }
    });
  });

  $("#captureBtn").click(function () {
    $("#webcamContainer").show(); // Show webcam preview container

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(function (stream) {
        let video = document.getElementById("webcamPreview");
        video.srcObject = stream;
        video.play();

        $("#captureBtn").click(function () {
          let canvas = document.createElement("canvas");
          let context = canvas.getContext("2d");

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0);

          let imageData = canvas.toDataURL("image/jpeg");
          let mockFile = dataURItoBlob(imageData); // Added conversion to Blob
          dz.addFile(mockFile);

          $("#webcamContainer").hide(); // Hide webcam preview container

          stream.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
        });
      })
      .catch(function (error) {
        console.error("Error accessing webcam:", error);
        $("#webcamContainer").hide(); // Hide webcam preview container on error
      });
  });

  $("#submitBtn").on('click', function (e) {
    dz.processQueue();
  });
}

// Function to display the uploaded image in the result holder
function displayImageInResultHolder(imageData) {
  let img = document.createElement('img');
  img.src = imageData;
  img.style.maxWidth = '100%'; // Adjust image size if needed
  $("#resultHolder").empty().append(img);
}

$(document).ready(function () {
  console.log("ready!");
  $("#error").hide();
  $("#resultHolder").hide(); // Hide resultHolder initially
  $("#divClassTable").hide();

  init();
});

// Helper function to convert data URI to Blob
function dataURItoBlob(dataURI) {
  let byteString = atob(dataURI.split(",")[1]);
  let mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  let ab = new ArrayBuffer(byteString.length);
  let ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

