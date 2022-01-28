FROM nginx:1.17.5

ENV GIT_URL https://github.com/kadena-community/kadena-transfer-js.git

RUN apt-get -y update \
&& apt-get -y install git \
&& git clone ${GIT_URL} \
&& cp -r /kadena-transfer-js/docs/* /usr/share/nginx/html
