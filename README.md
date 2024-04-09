## Dockerizing ifa -notification -manager
 Step 1: Create the Dockerfile 
  --- 
     command used: touch Dockerfile
   ---- 
 step 2: Build the docker image.
   ---
    command used: sudo docker build -t intelliflow/ifa-notification-mgr --build-arg PROFILE=colo .
   ---
   step 3: Run the docker image.
   ----
    command used: sudo docker run -p 31601:31601 notification_manager
     ---
     The above command starts the notification manager image inside the container and exposes port 31601 inside container to port 31601 outside the container.
     ----

   step 4: Check the image created 
   ---
    command used: docker images
   ---
 step 5:Access the route on server using http://localhost:31601

