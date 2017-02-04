const FILTER_OPTIONS_LOCAL_STORAGE_KEY = 'filterStorage';
const HOUR = 1000 * 60 * 60;

var viewOptions = [
  {
    optionName: 'Week',
    optionId: 'week'
  },
  {
    optionName: 'Day',
    optionId: 'day'
  },
  {
    optionName: 'Rolling Window',
    optionId: 'rolling',
    additionalFields: [
      {
        fieldName: 'Past Hours in Window',
        fieldId: 'pastRollingHours'
      },
      {
        fieldName: 'Future Hours in Window',
        fieldId: 'futureRollingHours'
      }
    ]
  }
];

//todo: Make this update from server.
var dcList = ['eu11','na14','na15','na35'];

function populateFilterOptionsPanel(){
  var panel = document.getElementById('filterPanel');
  var opts = getFilterOptions();

  panel.innerHTML = '';
  var viewOptEl = document.createElement('div');
  viewOptEl.className='viewOptions';
  viewOptEl.appendChild(document.createTextNode('View Options:'));

  for(var i in viewOptions){
    var o = viewOptions[i];
    var viewEl = document.createElement('input');
    viewEl.name="viewOption";
    viewEl.className="viewOption";
    viewEl.id=o.optionId;
    viewEl.value=o.optionId;
    viewEl.type='radio';
    viewEl.onclick = function() {saveChangeAndRepopFilter(true)};
    if(opts.viewOption && opts.viewOption.optionId == o.optionId){
      viewEl.checked='checked';
    }
    var contents = document.createTextNode(o.optionName);

    viewOptEl.appendChild(viewEl);
    viewOptEl.appendChild(contents);
    viewOptEl.appendChild(document.createElement('br'));
  }
  panel.appendChild(viewOptEl);

  var additionalFieldsEl = document.createElement('div');
  additionalFieldsEl.className = 'additionalFields';
  var isFields = false;

  if(opts && opts.viewOption && opts.viewOption.optionId){
    var vo = getViewOptionForId(opts.viewOption.optionId);
    if(vo && vo.additionalFields){
      vo.additionalFields.forEach(function(field){
        isFields = true;
        var afEl = document.createElement('input');
        var val = opts.viewOption[field.fieldId];
        afEl.name = field.fieldName;
        afEl.className = 'additionalField';
        afEl.id = field.fieldId;
        afEl.value = (val) ? val : 0;
        afEl.type = 'text';
        afEl.onkeyup = function() {saveChangeAndRepopFilter(false)};

        additionalFieldsEl.appendChild(document.createTextNode(field.fieldName + ':'));
        additionalFieldsEl.appendChild(afEl);
        additionalFieldsEl.appendChild(document.createElement('div'));

      });
    }
  }

  if(isFields) panel.appendChild(additionalFieldsEl);

  var dcListEl = document.createElement('div');
  dcListEl.className='dcList';
  dcListEl.appendChild(document.createTextNode('Datacenters:'));
  dcList.forEach(function(dc){
    var dcEl = document.createElement('input');
    dcEl.name = "dcs";
    dcEl.className= "dcs";
    dcEl.id=dc;
    dcEl.valeu=dc;
    dcEl.type="checkbox"
    dcEl.onclick = function() {saveChangeAndRepopFilter(true)};
    if(opts.dcs && opts.dcs.includes(dc)){
      dcEl.checked="checked";
    }
    var contents = document.createTextNode(dc);

    dcListEl.appendChild(dcEl);
    dcListEl.appendChild(contents);
    dcListEl.appendChild(document.createElement('br'));

  });

  panel.appendChild(dcListEl);
}

function saveChangeAndRepopFilter(repopulate){
  var fo = {};
  fo.viewOption = {};
  fo.dcs = [];

  var selectedId = document.querySelector('input[name="viewOption"]:checked').id;
  fo.viewOption.optionId = selectedId;

  var vo = getViewOptionForId(selectedId);
  if(vo && vo.additionalFields) {
    vo.additionalFields.forEach(function(field){
      var el = document.getElementById(field.fieldId);
      if(el){
        fo.viewOption[field.fieldId] = el.value;
      }
    });
  }


  var dcEls = document.querySelectorAll('input[name="dcs"]:checked');
  dcEls.forEach(function(dcEl){
    fo.dcs.push(dcEl.id);
  });

  saveFilterOptions(fo);
  if(repopulate)  populateFilterOptionsPanel();
}

function getViewOptionForId(id){
  var option = null;
  var result = viewOptions.forEach(function(o){
    if(o.optionId === id){
      option = o;
    }
  });
  return option;
}

function getUrlParamsFromFilter(){
  var opts = getFilterOptions();
  var ret = "?dataCenters=";
  if(opts.dcs){
    ret += opts.dcs;
  }
  if(opts.viewOption){
    if(opts.viewOption.optionId === 'rolling'){
      var future = 0;
      if(opts.viewOption.futureRollingHours){
        future = Number(opts.viewOption.futureRollingHours);
      }
      var past = 0;
      if(opts.viewOption.pastRollingHours){
        past = Number(opts.viewOption.pastRollingHours);
      }

      if(isNaN(past)){
        past = 0;
        opts.viewOption.pastRollingHours = 0;
        saveFilterOptions(opts);
      }
      if(isNaN(future)){
        future = 0;
        opts.viewOption.futureRollingHours = 0;
        saveFilterOptions(opts);
      }

      if((future + past) < 8){
        past += (8 - (future + past));
      }
      var now = new Date().getTime();
      var later = now + (future * HOUR);
      ret += '&endDateTime=' + later + '&timePeriod=' + (past + future);
    }
    else if(opts.viewOption.optionId === 'week'){
      ret += getViewTypeUrlParams('week');
    }
    //default case will be 'day' view.
    else {
      ret += getViewTypeUrlParams('day');
    }
  }

  return ret;
}

function getViewTypeUrlParams(viewType){
  if(viewType && viewType === 'day'){
    return '&endDateTime=' + getTomorrowDate() + '&timePeriod=24';
  }
  if(viewType && viewType === 'week'){
    return '&endDateTime=' + getEndOfWeek() + '&timePeriod=' + (24 * 7);
  }
  return '';
}

function getTomorrowDate(){
  var t = new Date(new Date().getTime() + (1000 * 60 * 60 * 24));
  return getMidnight(t);
}

function getMidnight(date){
  return new Date((date.getYear() + 1900) + '/' + (date.getMonth() + 1) + '/' + date.getDate()).getTime();
}

function getEndOfWeek(){
  var today = new Date();
  var toAdd = 7 - today.getDay();
  var n = new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * toAdd));
  return getMidnight(n);
}

function saveFilterOptions(filterOptions){
  localStorage.setItem(FILTER_OPTIONS_LOCAL_STORAGE_KEY,JSON.stringify(filterOptions));
  return filterOptions;
}

function getFilterOptions(){
  var opts = JSON.parse(localStorage.getItem(FILTER_OPTIONS_LOCAL_STORAGE_KEY));
  if(opts) {
    return opts;
  }
  else {
    //default value:
    return {
      viewOption: {
        optionId: 'day'
      },
      dcs: dcList
    };
  }
}

function clearFilterOptions(){
  localStorage.removeItem(FILTER_OPTIONS_LOCAL_STORAGE_KEY);
}
